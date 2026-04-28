#!/usr/bin/env bash
# pm2가 smap-eng-next를 띄울 때 사용하는 wrapper.
# .next/BUILD_ID가 없으면 즉시 종료하여 무한 크래시 루프를 차단한다.
# 빌드는 자동 실행하지 않는다 — 운영 중 의도치 않은 다운타임을 막기 위해
# 빌드는 반드시 scripts/deploy.sh 같은 명시적 배포 경로에서만 수행한다.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BUILD_ID_PATH=".next/BUILD_ID"

if [[ ! -f "$BUILD_ID_PATH" ]]; then
  echo "[start-next] FATAL: $BUILD_ID_PATH not found." >&2
  echo "[start-next] Run 'bash scripts/deploy.sh' (or 'pnpm build') before starting." >&2
  exit 1
fi

PORT="${PORT:-5029}"
echo "[start-next] BUILD_ID=$(cat "$BUILD_ID_PATH") PORT=$PORT"

exec ./node_modules/.bin/next start -p "$PORT"
