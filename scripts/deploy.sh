#!/usr/bin/env bash
# smap_eng 정식 배포 경로.
# 의존성 설치 → next/landing 빌드 → pm2 reload 순서를 강제한다.
# 빌드 실패 시 set -e로 즉시 중단되어 미빌드 상태가 운영에 반영되지 않는다.
#
# 사용:
#   bash scripts/deploy.sh             # 전체 (install + build + reload)
#   SKIP_INSTALL=1 bash scripts/deploy.sh   # lockfile 미변경 시 install 생략
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf '[deploy] %s\n' "$*"; }

if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
  log "pnpm install --frozen-lockfile"
  pnpm install --frozen-lockfile
else
  log "SKIP_INSTALL=1 → install 단계 건너뜀"
fi

log "pnpm build (next app/API)"
pnpm build

if [[ -d "$ROOT/apps/landing" ]]; then
  log "pnpm landing:build (apps/landing)"
  pnpm landing:build
fi

if [[ ! -f "$ROOT/.next/BUILD_ID" ]]; then
  log "FATAL: .next/BUILD_ID 가 생성되지 않았습니다. 빌드 로그를 확인하세요." >&2
  exit 1
fi

log "pm2 reload ecosystem.config.cjs --update-env"
pm2 reload ecosystem.config.cjs --update-env

log "DONE"
pm2 status
