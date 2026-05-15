/**
 * 카카오페이 심사용 테스트 계정 생성 스크립트.
 *
 * - 본 회원가입(`src/lib/auth/actions.ts`)과 동일한 scrypt(N=16384, r=8, p=1) 해싱 사용.
 * - 동일 이메일이 이미 존재하면 비밀번호만 재설정(idempotent).
 * - 기본 가족 프로필이 없으면 함께 생성.
 *
 * 실행:
 *   (set -a; . ./.env.local; set +a; node scripts/create-test-account.mjs)
 *
 * 옵션 환경변수:
 *   TEST_EMAIL    (default: kakaopay-review@smap.site)
 *   TEST_PASSWORD (default: KakaoPay2026!)
 *   TEST_NAME     (default: 카카오심사 보호자)
 *   TEST_CHILD    (default: 심사용아이)
 */
import { createConnection } from 'mysql2/promise';
import { randomBytes, randomUUID, scrypt as nodeScrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(nodeScrypt);
const PASSWORD_KEY_LENGTH = 64;

const TEST_EMAIL = (process.env.TEST_EMAIL ?? 'kakaopay-review@smap.site')
  .trim()
  .toLowerCase();
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'KakaoPay2026!';
const TEST_NAME = process.env.TEST_NAME ?? '카카오심사 보호자';
const TEST_CHILD = process.env.TEST_CHILD ?? '심사용아이';

if (!process.env.DATABASE_URL) {
  console.error('[create-test-account] DATABASE_URL not set. Source .env.local first.');
  process.exit(1);
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const key = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return ['scrypt', '16384', '8', '1', salt, key.toString('base64url')].join('$');
}

const conn = await createConnection(process.env.DATABASE_URL);

try {
  const passwordHash = await hashPassword(TEST_PASSWORD);

  const [existing] = await conn.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [TEST_EMAIL],
  );

  let userId;
  let action;
  if (existing.length > 0) {
    userId = existing[0].id;
    await conn.execute(
      'UPDATE users SET name = ?, password_hash = ?, role = ? WHERE id = ?',
      [TEST_NAME, passwordHash, 'user', userId],
    );
    action = 'updated';
  } else {
    userId = randomUUID();
    await conn.execute(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [userId, TEST_NAME, TEST_EMAIL, passwordHash, 'user'],
    );
    action = 'created';
  }

  const [profileRows] = await conn.execute(
    'SELECT id FROM profiles WHERE user_id = ? LIMIT 1',
    [userId],
  );
  let profileId;
  if (profileRows.length === 0) {
    const [insertResult] = await conn.execute(
      'INSERT INTO profiles (user_id, name, age, avatar) VALUES (?, ?, ?, ?)',
      [userId, TEST_CHILD, 7, '⭐'],
    );
    profileId = insertResult.insertId;
  } else {
    profileId = profileRows[0].id;
  }

  console.log('────────────────────────────────────────────────');
  console.log(`✅ 테스트 계정 ${action}`);
  console.log('────────────────────────────────────────────────');
  console.log(`  로그인 URL : https://eng.smap.site/login`);
  console.log(`  이메일     : ${TEST_EMAIL}`);
  console.log(`  비밀번호   : ${TEST_PASSWORD}`);
  console.log(`  user.id    : ${userId}`);
  console.log(`  profile.id : ${profileId}`);
  console.log(`  보호자명   : ${TEST_NAME}`);
  console.log(`  아이 이름   : ${TEST_CHILD}`);
  console.log('────────────────────────────────────────────────');
  console.log('※ 결제 심사 종료 후 비활성화 권장:');
  console.log(`   DELETE FROM users WHERE id = '${userId}';`);
  console.log('────────────────────────────────────────────────');
} finally {
  await conn.end();
}
