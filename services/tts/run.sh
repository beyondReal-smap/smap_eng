#!/usr/bin/env bash
# Supertonic TTS 서버 기동 스크립트
# 사용: ./services/tts/run.sh (또는 PORT=9000 ./services/tts/run.sh)
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "[!] .venv가 없습니다. 먼저 venv를 생성하세요:"
  echo "    python3.10 -m venv services/tts/.venv"
  echo "    services/tts/.venv/bin/pip install -r services/tts/requirements.txt"
  exit 1
fi

PORT="${PORT:-8880}"
HOST="${HOST:-127.0.0.1}"

echo "[+] Supertonic TTS starting on ${HOST}:${PORT}"
exec ./.venv/bin/uvicorn server:app --host "$HOST" --port "$PORT" --log-level info
