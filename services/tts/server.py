"""Supertonic TTS FastAPI server for smap_eng.

- Endpoint POST /v1/tts returns MP3 bytes.
- 99M ONNX 모델은 첫 요청 시 lazy-load(cold start: 모델 자동 다운로드 포함 시 수~수십초).
"""

from __future__ import annotations

import gc
import io
import logging
import os
from typing import Any, Optional

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from supertonic import TTS

# Supertonic은 44.1kHz 16-bit를 네이티브로 출력 → Kokoro 시절의 24k→44.1k 폴리페이즈
# 리샘플 단계가 더 이상 필요 없다(CD 표준 44.1kHz는 거의 모든 audio stack이 1순위 지원).
_OUTPUT_SR = 44100

# 본 서비스는 영어 낭독 전용이라 언어 코드를 고정한다(Supertonic은 31개 언어 지원).
_LANG = "en"


def _read_steps() -> int:
    """합성 품질/속도 트레이드오프(5=low ~ 12=high, 기본 8=medium).

    어린이 낭독은 발음이 또렷할수록 좋아 기본 8을 유지하되, 운영 중 부하/품질 튜닝을
    위해 env로 조정 가능. 범위를 벗어난 값은 기본값으로 안전 폴백.
    """
    raw = os.environ.get("SUPERTONIC_STEPS")
    if not raw:
        return 8
    try:
        n = int(raw)
    except ValueError:
        return 8
    return n if 5 <= n <= 12 else 8


_TOTAL_STEPS = _read_steps()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("supertonic-tts")

app = FastAPI(title="smap_eng Supertonic TTS")

_tts: Optional[TTS] = None
# voice_name → voice_style 객체 캐시. get_voice_style은 자산 로드를 동반하므로
# 요청마다 재생성하지 않고 voice별로 1회만 만들어 재사용한다.
_voice_styles: dict[str, Any] = {}


def get_tts() -> TTS:
    """Lazy-load the Supertonic ONNX TTS engine(첫 실행 시 HF에서 모델 자동 다운로드)."""
    global _tts
    if _tts is None:
        log.info("Loading Supertonic TTS (99M ONNX, auto_download)…")
        _tts = TTS(auto_download=True)
        log.info("Supertonic ready.")
    return _tts


def get_voice_style(voice_name: str) -> Any:
    style = _voice_styles.get(voice_name)
    if style is None:
        style = get_tts().get_voice_style(voice_name=voice_name)
        _voice_styles[voice_name] = style
    return style


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    # Supertonic voice id: M1/M2/M3/M4/M5(남성), F1/F2/F3/F4/F5(여성).
    voice: str = Field(default="F1")
    # Supertonic 허용 속도 범위 0.7~2.0.
    speed: float = Field(default=1.0, ge=0.7, le=2.0)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": "supertonic-3"}


@app.post("/v1/tts")
def tts(req: TtsRequest) -> Response:
    engine = get_tts()
    style = get_voice_style(req.voice)
    wav: Optional[np.ndarray] = None
    mono: Optional[np.ndarray] = None
    pcm16: Optional[np.ndarray] = None
    buf: Optional[io.BytesIO] = None
    try:
        wav, _duration = engine.synthesize(
            text=req.text,
            lang=_LANG,
            voice_style=style,
            total_steps=_TOTAL_STEPS,
            speed=req.speed,
        )
        # wav: shape (1, N) float32 @ 44.1kHz → soundfile 입력용 모노 1-D로 평탄화.
        mono = np.asarray(wav, dtype=np.float32).reshape(-1)
        if mono.size == 0:
            raise HTTPException(status_code=500, detail="No audio produced")
        # ⚠️ soundfile 0.13.x의 float→PCM_16 자동 변환은 단방향 dither(uniform[0,1)→floor)를
        # 적용하여 -0.5 LSB DC bias를 만든다. Python wave 디코더는 무시하지만 Chrome의
        # PipelineStatus::AUDIO_RENDERER_ERROR(MEDIA_ERR_DECODE) 원인으로 의심됨.
        # 직접 round-to-nearest 변환한 int16을 넘겨 soundfile의 dither를 우회한다.
        pcm16 = np.clip(np.round(mono * 32768.0), -32768, 32767).astype(np.int16)
        buf = io.BytesIO()
        # WAV(PCM 16bit 모노 44.1kHz)는 분당 ~5MB로 모바일 전송·디스크에 부담이 컸다.
        # MP3(VBR 모노, libsndfile 1.2+ LAME)는 약 1/10~1/16 크기이고 HTML <audio>·
        # AVAudioPlayer 모두 1순위로 지원한다. int16 직접 변환(위 dither 우회)은
        # 인코더 입력 단계에 그대로 유효하다.
        sf.write(buf, pcm16, _OUTPUT_SR, format="MP3")
        buf.seek(0)
        payload = buf.read()
        return Response(content=payload, media_type="audio/mpeg")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — surface upstream failures to caller
        log.exception("TTS error")
        raise HTTPException(status_code=500, detail=f"tts_error: {exc}") from exc
    finally:
        # 합성 결과(np.ndarray)와 MP3 buffer는 합성문이 길수록 누적된다. 백그라운드
        # prefetch가 연속 호출하면 GC 타이밍 전에 다음 합성이 시작되어 메모리가 spike →
        # PM2 max_memory_restart 트리거. 응답 직후 명시적 해제 + 강제 GC로 spike를
        # 단발성으로 한정한다(ONNX는 PyTorch 대비 footprint가 작아 여유가 더 크다).
        del wav, mono, pcm16, buf
        gc.collect()
