#!/usr/bin/env bash
# Supertonic TTS 테스트 페이지 서버 기동 스크립트 (개발/QA 전용)
# 사용: ./services/tts/run-test-page.sh
#   PORT=5105                       테스트 페이지 포트 (기본 5105)
#   SUPERTONIC_BASE_URL=http://...  업스트림 TTS 서버 (기본 http://127.0.0.1:5113)
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "[!] .venv가 없습니다. 먼저 venv를 생성하세요:"
  echo "    python3.10 -m venv services/tts/.venv"
  echo "    services/tts/.venv/bin/pip install -r services/tts/requirements.txt"
  exit 1
fi

PORT="${PORT:-5105}"
HOST="${HOST:-127.0.0.1}"

echo "[+] TTS test page starting on ${HOST}:${PORT}"
echo "    upstream = ${SUPERTONIC_BASE_URL:-http://127.0.0.1:5113}"
exec ./.venv/bin/uvicorn test_page:app --host "$HOST" --port "$PORT" --log-level info
