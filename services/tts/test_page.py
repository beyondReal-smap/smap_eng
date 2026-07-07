"""Supertonic TTS 테스트 페이지 서버 (개발/QA 전용, 포트 5105).

운영 TTS 서버(server.py, 5113)는 건드리지 않고, 합성 품질을 빠르게 들어보기 위한
독립 페이지를 제공한다.

- GET  /            → 테스트 HTML 페이지
- POST /v1/tts      → 업스트림 TTS 서버(5113)로 중계(proxy). 같은 origin이라 CORS 불필요.
- GET  /api/health  → 업스트림 health를 그대로 프록시(페이지 상단 상태 배지용).

업스트림 주소는 SUPERTONIC_BASE_URL env로 조정(기본 http://127.0.0.1:5113).
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, Response
from pydantic import BaseModel, Field

# 업스트림(운영 TTS)은 PM2에서 5113으로 뜬다. 로컬에서 8880 등으로 직접 띄웠다면 env로 덮어쓴다.
_UPSTREAM = os.environ.get("SUPERTONIC_BASE_URL", "http://127.0.0.1:5113").rstrip("/")

# 합성은 cold start(모델 자동 다운로드)·긴 문장에서 수십 초가 걸릴 수 있어 넉넉히 잡는다.
_PROXY_TIMEOUT_S = 120.0

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("supertonic-tts-testpage")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # HTTP client는 요청마다 만들지 않고 앱 수명주기로 관리(connection 재사용).
    app.state.client = httpx.AsyncClient(timeout=httpx.Timeout(_PROXY_TIMEOUT_S))
    log.info("TTS test page proxying to upstream=%s", _UPSTREAM)
    try:
        yield
    finally:
        await app.state.client.aclose()


app = FastAPI(title="smap_eng TTS Test Page", lifespan=lifespan)


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    voice: str = Field(default="F1")
    speed: float = Field(default=0.85, ge=0.7, le=2.0)


@app.get("/api/health")
async def health() -> JSONResponse:
    """업스트림 TTS 서버 상태를 프록시. 페이지는 이 값으로 상단 배지를 그린다."""
    client: httpx.AsyncClient = app.state.client
    try:
        r = await client.get(f"{_UPSTREAM}/health", timeout=2.0)
    except httpx.RequestError as exc:
        return JSONResponse(
            status_code=502,
            content={"ok": False, "upstream": _UPSTREAM, "error": str(exc)},
        )
    return JSONResponse(
        status_code=200 if r.is_success else 502,
        content={
            "ok": r.is_success,
            "upstream": _UPSTREAM,
            "status_code": r.status_code,
            "body": _safe_json(r),
        },
    )


def _safe_json(r: httpx.Response) -> object:
    try:
        return r.json()
    except ValueError:
        return r.text[:200]


@app.post("/v1/tts")
async def proxy_tts(req: TtsRequest) -> Response:
    """텍스트를 업스트림으로 중계하고 MP3 바이트를 그대로 돌려준다."""
    client: httpx.AsyncClient = app.state.client
    try:
        r = await client.post(f"{_UPSTREAM}/v1/tts", json=req.model_dump())
    except httpx.RequestError as exc:
        # 업스트림 미기동/네트워크 장애 → 502로 명확히 구분(에러 뭉개기 금지).
        log.warning("upstream unreachable: %s", exc)
        raise HTTPException(
            status_code=502, detail=f"upstream_unreachable: {exc}"
        ) from exc

    if not r.is_success:
        # 업스트림 4xx/5xx는 상태코드와 본문을 살려 그대로 전달.
        raise HTTPException(status_code=r.status_code, detail=r.text[:500])

    return Response(content=r.content, media_type="audio/mpeg")


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    return HTMLResponse(content=_PAGE_HTML)


_PAGE_HTML = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Supertonic TTS 테스트</title>
<style>
  :root {
    --bg: #0f1115; --panel: #181b22; --border: #2a2f3a; --fg: #e6e9ef;
    --muted: #9aa3b2; --accent: #4f8cff; --ok: #2ecc71; --err: #ff5d5d;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
    line-height: 1.5;
  }
  .wrap { max-width: 720px; margin: 0 auto; padding: 28px 18px 64px; }
  header { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
  h1 { font-size: 20px; margin: 0; }
  .sub { color: var(--muted); font-size: 13px; margin: 0 0 20px; }
  .badge {
    font-size: 12px; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--border);
    color: var(--muted); white-space: nowrap;
  }
  .badge.ok { color: var(--ok); border-color: rgba(46,204,113,.4); }
  .badge.err { color: var(--err); border-color: rgba(255,93,93,.4); }
  .panel {
    background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
    padding: 18px; margin-bottom: 16px;
  }
  label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px; }
  textarea, select, input[type="text"] {
    width: 100%; background: #11141a; color: var(--fg); border: 1px solid var(--border);
    border-radius: 10px; padding: 11px 12px; font-size: 15px; font-family: inherit;
  }
  textarea { min-height: 110px; resize: vertical; }
  .row { display: flex; gap: 14px; flex-wrap: wrap; }
  .row > div { flex: 1 1 200px; }
  .field { margin-bottom: 14px; }
  .speed-line { display: flex; align-items: center; gap: 12px; }
  input[type="range"] { flex: 1; accent-color: var(--accent); }
  .speed-val { font-variant-numeric: tabular-nums; min-width: 42px; text-align: right; }
  button {
    background: var(--accent); color: #fff; border: 0; border-radius: 10px;
    padding: 12px 20px; font-size: 15px; font-weight: 600; cursor: pointer;
  }
  button:disabled { opacity: .55; cursor: progress; }
  .result { margin-top: 4px; }
  audio { width: 100%; margin-top: 10px; }
  .meta { color: var(--muted); font-size: 13px; margin-top: 10px; display: flex; gap: 16px; flex-wrap: wrap; }
  .err-box {
    color: var(--err); background: rgba(255,93,93,.08); border: 1px solid rgba(255,93,93,.3);
    border-radius: 10px; padding: 12px; font-size: 13px; white-space: pre-wrap; word-break: break-word;
  }
  .dl { color: var(--accent); text-decoration: none; font-size: 13px; }
  .hint { color: var(--muted); font-size: 12px; margin-top: 6px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>🔊 Supertonic TTS 테스트</h1>
    <span id="status" class="badge">상태 확인 중…</span>
  </header>
  <p class="sub">업스트림 합성 서버로 중계하여 음성을 합성·재생합니다.</p>

  <div class="panel">
    <div class="field">
      <label for="text">텍스트 (최대 2000자)</label>
      <textarea id="text" maxlength="2000" placeholder="합성할 영어 문장을 입력하세요.">Once upon a time, a little fox found a glowing star in the forest.</textarea>
    </div>

    <div class="row">
      <div class="field">
        <label for="voice">음성 (Voice)</label>
        <select id="voice">
          <optgroup label="여성">
            <option value="F1" selected>F1</option>
            <option value="F2">F2</option>
            <option value="F3">F3</option>
            <option value="F4">F4</option>
            <option value="F5">F5</option>
          </optgroup>
          <optgroup label="남성">
            <option value="M1">M1</option>
            <option value="M2">M2</option>
            <option value="M3">M3</option>
            <option value="M4">M4</option>
            <option value="M5">M5</option>
          </optgroup>
        </select>
      </div>
      <div class="field">
        <label for="speed">속도 (Speed) 0.7 ~ 2.0</label>
        <div class="speed-line">
          <input id="speed" type="range" min="0.7" max="2.0" step="0.05" value="0.85" />
          <span id="speedVal" class="speed-val">0.85</span>
        </div>
        <div class="hint">기본 0.85 — 어린이 학습용으로 약간 느리게</div>
      </div>
    </div>

    <button id="synth">합성하기</button>
  </div>

  <div id="resultPanel" class="panel result" style="display:none;">
    <div id="errBox" class="err-box" style="display:none;"></div>
    <audio id="player" controls style="display:none;"></audio>
    <div id="meta" class="meta"></div>
  </div>
</div>

<script>
  const $ = (id) => document.getElementById(id);
  const speed = $("speed"), speedVal = $("speedVal");
  speed.addEventListener("input", () => { speedVal.textContent = Number(speed.value).toFixed(2); });

  let lastUrl = null;

  async function refreshStatus() {
    const el = $("status");
    try {
      const r = await fetch("/api/health");
      const j = await r.json();
      if (j.ok) {
        el.textContent = "업스트림 OK";
        el.className = "badge ok";
      } else {
        el.textContent = "업스트림 오류 (" + (j.status_code || j.error || "?") + ")";
        el.className = "badge err";
      }
    } catch (e) {
      el.textContent = "상태 확인 실패";
      el.className = "badge err";
    }
  }

  $("synth").addEventListener("click", async () => {
    const btn = $("synth");
    const text = $("text").value.trim();
    const panel = $("resultPanel"), errBox = $("errBox"), player = $("player"), meta = $("meta");
    panel.style.display = "block";
    errBox.style.display = "none";
    meta.innerHTML = "";
    if (!text) {
      errBox.textContent = "텍스트를 입력하세요.";
      errBox.style.display = "block";
      player.style.display = "none";
      return;
    }

    btn.disabled = true;
    btn.textContent = "합성 중…";
    const t0 = performance.now();
    try {
      const res = await fetch("/v1/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, voice: $("voice").value, speed: Number(speed.value) }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error("HTTP " + res.status + " — " + body.slice(0, 400));
      }
      const blob = await res.blob();
      const ms = Math.round(performance.now() - t0);
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      lastUrl = URL.createObjectURL(blob);

      player.src = lastUrl;
      player.style.display = "block";
      player.play().catch(() => {});

      const kb = (blob.size / 1024).toFixed(1);
      meta.innerHTML =
        '<span>⏱ ' + ms + ' ms</span>' +
        '<span>📦 ' + kb + ' KB</span>' +
        '<span>🎙 ' + $("voice").value + ' · ' + Number(speed.value).toFixed(2) + 'x</span>' +
        '<a class="dl" href="' + lastUrl + '" download="tts.mp3">⬇ 다운로드</a>';
    } catch (e) {
      errBox.textContent = "합성 실패\\n" + (e && e.message ? e.message : String(e));
      errBox.style.display = "block";
      player.style.display = "none";
    } finally {
      btn.disabled = false;
      btn.textContent = "합성하기";
    }
  });

  refreshStatus();
  setInterval(refreshStatus, 15000);
</script>
</body>
</html>
"""
