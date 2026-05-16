#!/usr/bin/env node
/**
 * 매주 한 번 호출되는 cron 스크립트 — PM2 cron_restart가 정해진 시간에 본 프로세스를 띄우고,
 * 본 스크립트는 내부 HTTP 엔드포인트에 한 번 POST한 뒤 종료한다(autorestart:false 짝).
 *
 * 환경변수:
 *   CRON_TOKEN — /api/parents/notify-weekly가 검증하는 시크릿 (ecosystem.config.cjs와 동일 값)
 *   NEXT_LOCAL_URL — Next 앱 로컬 주소 (기본 http://127.0.0.1:5029)
 */

const url = `${process.env.NEXT_LOCAL_URL ?? 'http://127.0.0.1:5029'}/api/parents/notify-weekly`;
const token = process.env.CRON_TOKEN;

if (!token) {
  console.error('[cron-weekly] CRON_TOKEN missing');
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
