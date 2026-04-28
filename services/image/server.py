"""FLUX.1-schnell FastAPI server for smap_eng (Diffusers CPU, Linux).

- POST /v1/image returns PNG bytes.
- 파이프라인은 첫 요청 시 지연 로드 (콜드스타트 수 분, 모델 ~24GB).
- CPU에서는 장당 수~십 분 이상 소요 — 개발/테스트용.
- 환경변수:
  * FLUX_MODEL_ID (기본 "black-forest-labs/FLUX.1-schnell")
  * FLUX_DTYPE (기본 "bfloat16", fallback "float32")
  * HF_HOME (모델 캐시 디렉토리)
"""

from __future__ import annotations

import io
import logging
import os
from typing import Optional

import torch
from diffusers import FluxPipeline
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("flux")

app = FastAPI(title="smap_eng FLUX.1-schnell (Diffusers CPU)")

MODEL_ID = os.environ.get("FLUX_MODEL_ID", "black-forest-labs/FLUX.1-schnell")
_DTYPE_NAME = os.environ.get("FLUX_DTYPE", "bfloat16").lower()
_DTYPE = {
    "bfloat16": torch.bfloat16,
    "float32": torch.float32,
    "float16": torch.float16,
}.get(_DTYPE_NAME, torch.bfloat16)

_pipeline: Optional[FluxPipeline] = None


def get_pipeline() -> FluxPipeline:
    """첫 호출 시 FLUX.1-schnell 파이프라인을 로드. CPU 고정."""
    global _pipeline
    if _pipeline is None:
        log.info("Loading FluxPipeline model=%s dtype=%s…", MODEL_ID, _DTYPE_NAME)
        pipe = FluxPipeline.from_pretrained(MODEL_ID, torch_dtype=_DTYPE)
        pipe.to("cpu")
        _pipeline = pipe
        log.info("Pipeline ready (cpu, dtype=%s).", _DTYPE_NAME)
    return _pipeline


class ImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    width: int = Field(default=1024, ge=256, le=2048)
    height: int = Field(default=768, ge=256, le=2048)
    steps: int = Field(default=4, ge=1, le=8)
    seed: Optional[int] = None
    guidance: float = Field(default=0.0, ge=0.0, le=15.0)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "model": MODEL_ID,
        "device": "cpu",
        "dtype": _DTYPE_NAME,
        "loaded": str(_pipeline is not None),
    }


@app.post("/v1/image")
def image(req: ImageRequest) -> Response:
    pipeline = get_pipeline()
    try:
        generator = (
            torch.Generator(device="cpu").manual_seed(req.seed)
            if req.seed is not None
            else None
        )
        log.info(
            "Generating image (prompt_len=%d, %dx%d, steps=%d, guidance=%.2f)",
            len(req.prompt), req.width, req.height, req.steps, req.guidance,
        )
        result = pipeline(
            prompt=req.prompt,
            width=req.width,
            height=req.height,
            num_inference_steps=req.steps,
            guidance_scale=req.guidance,
            generator=generator,
            max_sequence_length=256,
        )
        if not result.images:
            raise HTTPException(500, "flux produced no image")
        img = result.images[0]
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return Response(content=buf.read(), media_type="image/png")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — surface upstream failures
        log.exception("Image gen error")
        raise HTTPException(status_code=500, detail=f"image_error: {exc}") from exc
