"""Kokoro-82M TTS FastAPI server for smap_eng.

- Endpoint POST /v1/tts returns WAV bytes.
- Pipeline is loaded lazily on first request (cold start ≈ 2–5s).
"""

from __future__ import annotations

import gc
import io
import logging
from typing import Optional

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from kokoro import KPipeline
from pydantic import BaseModel, Field
from scipy.signal import resample_poly

# Kokoro 네이티브 출력 sample rate(24 kHz)는 일부 모바일에서 MEDIA_ERR_DECODE.
# 48 kHz로 올렸더니 일부 데스크탑 Chrome에서 PipelineStatus::AUDIO_RENDERER_ERROR
# (디코드 후 audio output device에 PCM 전달 단계 실패)가 보고됨.
# CD 표준 44.1 kHz는 거의 모든 audio stack에서 1순위로 지원되어 가장 안전.
# 24000 → 44100 polyphase: GCD(24000,44100)=300 → up=441, down=240
_KOKORO_SR = 24000
_OUTPUT_SR = 44100
_RESAMPLE_UP = 441
_RESAMPLE_DOWN = 240

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("kokoro-tts")

app = FastAPI(title="smap_eng Kokoro TTS")

_pipeline: Optional[KPipeline] = None


def get_pipeline() -> KPipeline:
    """Lazy-load the Kokoro pipeline for American English ('a')."""
    global _pipeline
    if _pipeline is None:
        log.info("Loading Kokoro pipeline (lang=a, en-US)…")
        _pipeline = KPipeline(lang_code="a")
        log.info("Pipeline ready.")
    return _pipeline


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    voice: str = Field(default="af_heart")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": "kokoro-82M"}


@app.post("/v1/tts")
def tts(req: TtsRequest) -> Response:
    pipeline = get_pipeline()
    chunks: list[np.ndarray] = []
    full: Optional[np.ndarray] = None
    upsampled: Optional[np.ndarray] = None
    buf: Optional[io.BytesIO] = None
    try:
        for _, _, audio in pipeline(req.text, voice=req.voice, speed=req.speed):
            chunks.append(audio)
        if not chunks:
            raise HTTPException(status_code=500, detail="No audio produced")
        full = np.concatenate(chunks)
        # 24 kHz → 48 kHz polyphase upsample (anti-aliasing 포함).
        upsampled = resample_poly(full, _RESAMPLE_UP, _RESAMPLE_DOWN).astype(np.float32)
        # ⚠️ soundfile 0.13.x의 float→PCM_16 자동 변환은 단방향 dither(uniform[0,1)→floor)를
        # 적용하여 -0.5 LSB DC bias를 만든다. Python wave 디코더는 무시하지만 Chrome의
        # PipelineStatus::AUDIO_RENDERER_ERROR(MEDIA_ERR_DECODE) 원인으로 의심됨.
        # 직접 round-to-nearest 변환한 int16을 넘겨 soundfile의 dither를 우회.
        pcm16 = np.clip(np.round(upsampled * 32768.0), -32768, 32767).astype(np.int16)
        buf = io.BytesIO()
        sf.write(buf, pcm16, _OUTPUT_SR, format="WAV", subtype="PCM_16")
        buf.seek(0)
        payload = buf.read()
        return Response(content=payload, media_type="audio/wav")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — surface upstream failures to caller
        log.exception("TTS error")
        raise HTTPException(status_code=500, detail=f"tts_error: {exc}") from exc
    finally:
        # PyTorch 합성 결과(np.ndarray)와 WAV buffer는 합성문이 길수록 수백 MB까지
        # 누적된다. 백그라운드 prefetch가 연속 호출하면 GC 타이밍 전에 다음 합성이
        # 시작되어 메모리가 spike → PM2 max_memory_restart 트리거. 응답 직후 명시적
        # 해제 + 강제 GC로 spike를 단발성으로 한정한다.
        chunks.clear()
        del full, upsampled, buf
        gc.collect()
