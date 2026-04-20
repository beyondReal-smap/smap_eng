"""Kokoro-82M TTS FastAPI server for smap_eng.

- Endpoint POST /v1/tts returns WAV bytes.
- Pipeline is loaded lazily on first request (cold start ≈ 2–5s).
"""

from __future__ import annotations

import io
import logging
from typing import Optional

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from kokoro import KPipeline
from pydantic import BaseModel, Field

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
    try:
        chunks: list[np.ndarray] = []
        for _, _, audio in pipeline(req.text, voice=req.voice, speed=req.speed):
            chunks.append(audio)
        if not chunks:
            raise HTTPException(status_code=500, detail="No audio produced")
        full = np.concatenate(chunks)
        buf = io.BytesIO()
        sf.write(buf, full, 24000, format="WAV")
        buf.seek(0)
        return Response(content=buf.read(), media_type="audio/wav")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — surface upstream failures to caller
        log.exception("TTS error")
        raise HTTPException(status_code=500, detail=f"tts_error: {exc}") from exc
