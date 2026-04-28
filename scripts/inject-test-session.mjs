#!/usr/bin/env node
/**
 * 일회성 e2e 테스트용 세션 주입 스크립트.
 *
 * Auth.js v5 OAuth 의존성을 우회하여 테스트 user + DB session row를 만든다.
 * 출력으로 sessionToken을 콘솔에 표시 → Playwright 등에서 cookie로 설정.
 *
 * 사용 후 정리: scripts/cleanup-test-session.mjs 실행 또는 SQL로 직접 삭제.
 */
// node --env-file=.env.local 로 실행 → process.env 자동 주입.
import { createConnection } from 'mysql2/promise';
import { randomBytes } from 'node:crypto';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const userId = randomBytes(12).toString('hex');
const sessionToken = randomBytes(32).toString('base64url');
const email = `e2e-test-${Date.now()}@hwgiai.team.dev`;
const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

const conn = await createConnection(dbUrl);
try {
  await conn.beginTransaction();
  await conn.execute(
    'INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)',
    [userId, 'E2E Test', email, 'user'],
  );
  await conn.execute(
    'INSERT INTO sessions (sessionToken, userId, expires) VALUES (?, ?, ?)',
    [sessionToken, userId, expires],
  );
  await conn.commit();
  console.log(JSON.stringify({ userId, sessionToken, email, expires: expires.toISOString() }));
} catch (err) {
  await conn.rollback();
  console.error('inject failed:', err);
  process.exit(1);
} finally {
  await conn.end();
}
