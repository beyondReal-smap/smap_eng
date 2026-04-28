#!/usr/bin/env bash
# 원격 MariaDB(211.188.53.253:3306) 접속용 SSH 터널.
# 이 스크립트를 실행한 터미널을 띄워둔 채 개발 서버(pnpm dev)를 돌린다.
# Ctrl+C 로 터널 종료.
set -euo pipefail

REMOTE_HOST="${DB_SSH_HOST:-root@211.188.53.253}"
LOCAL_PORT="${DB_LOCAL_PORT:-3306}"
REMOTE_PORT="${DB_REMOTE_PORT:-3306}"

if lsof -iTCP:"${LOCAL_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[db-tunnel] 포트 ${LOCAL_PORT} 이미 사용 중. 기존 프로세스를 닫거나 DB_LOCAL_PORT 환경변수로 다른 포트 지정 필요." >&2
  exit 1
fi

echo "[db-tunnel] ${REMOTE_HOST}:${REMOTE_PORT} -> localhost:${LOCAL_PORT}"
echo "[db-tunnel] 종료하려면 Ctrl+C"
exec ssh -N \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -L "${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" \
  "${REMOTE_HOST}"
