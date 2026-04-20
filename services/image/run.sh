#!/usr/bin/env bash
# FLUX.1-schnell 서버 기동 스크립트 (Apple Silicon MLX)
# 사용: ./services/image/run.sh (또는 PORT=9000 ./services/image/run.sh)
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "[!] .venv가 없습니다. 먼저 venv를 생성하세요:"
  echo "    python3.10 -m venv services/image/.venv"
  echo "    services/image/.venv/bin/pip install -r services/image/requirements.txt"
  exit 1
fi

PORT="${PORT:-8890}"
HOST="${HOST:-127.0.0.1}"

echo "[+] FLUX.1-schnell starting on ${HOST}:${PORT}"
exec ./.venv/bin/uvicorn server:app --host "$HOST" --port "$PORT" --log-level info
