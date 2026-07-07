#!/usr/bin/env node
/**
 * 매주 한 번 호출되는 cron 스크립트 — PM2 cron_restart가 정해진 시간에 본 프로세스를 띄우고,
 * 본 스크립트는 내부 HTTP 엔드포인트에 한 번 POST한 뒤 종료한다(autorestart:false 짝).
 *
 * 환경변수:
 *   CRON_TOKEN — /api/parents/notify-weekly가 검증하는 시크릿 (ecosystem.config.cjs와 동일 값)
 *   NEXT_LOCAL_URL — Next 앱 로컬 주소 (기본 http://127.0.0.1:5029)
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * PM2 env 블록에는 시크릿을 넣지 않으므로(ecosystem.config.cjs 커밋 대상),
 * process.env에 없으면 프로젝트 루트의 .env.local에서 직접 읽는다.
 * dotenv 미설치 환경이라 KEY=VALUE 한 줄 파싱만 수행 — CRON_TOKEN 하나면 충분.
 */
function readEnvLocal(key) {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
  let raw;
  try {
    raw = readFileSync(envPath, 'utf8');
  } catch {
    return undefined;
  }
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '');
  }
  return undefined;
}

const url = `${process.env.NEXT_LOCAL_URL ?? 'http://127.0.0.1:5029'}/api/parents/notify-weekly`;
const token = process.env.CRON_TOKEN ?? readEnvLocal('CRON_TOKEN');

if (!token) {
  console.error('[cron-weekly] CRON_TOKEN missing (env & .env.local 모두 없음)');
  process.exit(1);
}

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Cron-Token': token,
      'Content-Type': 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[cron-weekly] failed ${res.status}: ${text}`);
    process.exit(1);
  }
  console.log(`[cron-weekly] ok ${res.status}: ${text}`);
  process.exit(0);
} catch (err) {
  console.error('[cron-weekly] network/error', err);
  process.exit(1);
}
