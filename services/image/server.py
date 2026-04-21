"""FLUX.1-schnell FastAPI server for smap_eng (Apple Silicon MLX via mflux CLI).

- POST /v1/image returns PNG bytes.
- Uses the `mflux-generate` CLI as a subprocess — insulates us from mflux
  Python API changes between versions.
- First generate downloads weights (~6GB for Q4). Subsequent calls are ~30s on M2 Pro.
"""

from __future__ import annotations

import logging
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("flux")

app = FastAPI(title="smap_eng FLUX.1-schnell")

VENV_BIN = Path(__file__).resolve().parent / ".venv" / "bin"
MFLUX_GENERATE = VENV_BIN / "mflux-generate"


class ImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    width: int = Field(default=1024, ge=256, le=2048)
    height: int = Field(default=768, ge=256, le=2048)
    steps: int = Field(default=4, ge=1, le=8)
    seed: Optional[int] = None
    guidance: float = Field(default=3.5, ge=0.0, le=15.0)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "model": "flux.1-schnell (mflux Q4)",
        "cli": str(MFLUX_GENERATE),
        "cli_exists": str(MFLUX_GENERATE.exists()),
    }


@app.post("/v1/image")
def image(req: ImageRequest) -> Response:
    if not MFLUX_GENERATE.exists():
        raise HTTPException(500, f"mflux-generate not found at {MFLUX_GENERATE}")

    out_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            out_path = tmp.name

        # mflux 0.17.x에서 --base-model schnell 단독 사용 시 VAE download_url이
        # 레지스트리에 없어 실패한다. --model로 HF 경로를 직접 지정해 우회.
        cmd = [
            str(MFLUX_GENERATE),
            "--model", "black-forest-labs/FLUX.1-schnell",
            "--quantize", "4",
            "--prompt", req.prompt,
            "--width", str(req.width),
            "--height", str(req.height),
            "--steps", str(req.steps),
            "--guidance", str(req.guidance),
            "--output", out_path,
        ]
        if req.seed is not None:
            cmd += ["--seed", str(req.seed)]

        log.info("Running mflux-generate (prompt len=%d, %dx%d, steps=%d)",
                 len(req.prompt), req.width, req.height, req.steps)

        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10분 (첫 호출 모델 다운로드 포함)
        )
        if proc.returncode != 0:
            tail = (proc.stderr or proc.stdout or "")[-600:]
            raise HTTPException(500, f"mflux_failed: {tail}")

        if not out_path or not os.path.exists(out_path):
            raise HTTPException(500, "mflux produced no output")

        with open(out_path, "rb") as f:
            data = f.read()
        if not data:
            raise HTTPException(500, "mflux output was empty")

        return Response(content=data, media_type="image/png")
    except HTTPException:
        raise
    except subprocess.TimeoutExpired:
        log.exception("mflux-generate timed out")
        raise HTTPException(504, "mflux_timeout (10 min)") from None
    except Exception as exc:  # noqa: BLE001
        log.exception("Image gen error")
        raise HTTPException(status_code=500, detail=f"image_error: {exc}") from exc
    finally:
        if out_path:
            try:
                os.unlink(out_path)
            except OSError:
                pass
