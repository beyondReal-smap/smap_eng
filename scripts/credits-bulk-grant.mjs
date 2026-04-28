#!/usr/bin/env node
/**
 * 잔액 0 활성 가족(프로필 보유)에게 별을 일괄 grant.
 *
 * 동작:
 *  1) 후보 = users JOIN profiles 중 credit_balances.balance < 1
 *  2) 트랜잭션 묶음: 행 선삽입(ON DUPLICATE KEY) → balance += DELTA → tx 기록
 *  3) note 컬럼은 schema에 없어 사용 안 함 — kind='grant' + delta로 식별
 *
 * 안전장치:
 *  --dry-run: 후보 목록만 출력하고 변경 없이 종료(기본)
 *  --apply:   실제 적용. 명시 필요.
 *  --delta=N: 1회 지급량(기본 5).
 *
 * 사용:
 *   DATABASE_URL=mysql://... node scripts/credits-bulk-grant.mjs --dry-run
 *   DATABASE_URL=mysql://... node scripts/credits-bulk-grant.mjs --apply --delta=5
 */
import { createConnection } from 'mysql2/promise';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const dry = args.includes('--dry-run') || !apply;
const deltaArg = args.find((a) => a.startsWith('--delta='));
const DELTA = deltaArg ? Number(deltaArg.split('=')[1]) : 5;

if (!Number.isInteger(DELTA) || DELTA <= 0 || DELTA > 1000) {
  console.error('invalid --delta (1..1000)');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await createConnection(process.env.DATABASE_URL);

// 후보 식별 — 활성 가족(프로필 보유) 중 잔액 0
const [candidates] = await conn.execute(`
  SELECT
    u.id,
    u.email,
    COALESCE(cb.balance, 0) AS balance
  FROM users u
  JOIN profiles p ON p.user_id = u.id
  LEFT JOIN credit_balances cb ON cb.user_id = u.id
  WHERE COALESCE(cb.balance, 0) = 0
  GROUP BY u.id, u.email, cb.balance
  ORDER BY u.created_at ASC
`);

console.log(`\n후보 ${candidates.length}명 · 1인당 +${DELTA}별 grant 예정`);
console.log(`총 지급량: ${candidates.length * DELTA}별`);
console.log(`모드: ${dry ? 'DRY-RUN (변경 없음)' : 'APPLY (실제 적용)'}`);

if (dry) {
  console.log('\n--apply 플래그 없이 실행되어 종료합니다. 실제 적용 시:');
  console.log(`  DATABASE_URL=... node scripts/credits-bulk-grant.mjs --apply --delta=${DELTA}\n`);
  await conn.end();
  process.exit(0);
}

let succeeded = 0;
let failed = 0;
for (const c of candidates) {
  try {
    await conn.beginTransaction();
    // 1) 행 선삽입(존재 시 no-op)
    await conn.execute(
      'INSERT INTO credit_balances (user_id, balance, total_purchased) VALUES (?, 0, 0) ON DUPLICATE KEY UPDATE user_id = user_id',
      [c.id],
    );
    // 2) FOR UPDATE 잠금 + 잔액 업데이트
    const [[locked]] = await conn.query(
      'SELECT balance FROM credit_balances WHERE user_id = ? FOR UPDATE',
      [c.id],
    );
    const next = Number(locked.balance) + DELTA;
    await conn.execute(
      'UPDATE credit_balances SET balance = ? WHERE user_id = ?',
      [next, c.id],
    );
    // 3) 원장
    await conn.execute(
      'INSERT INTO credit_transactions (user_id, kind, delta) VALUES (?, ?, ?)',
      [c.id, 'grant', DELTA],
    );
    await conn.commit();
    succeeded++;
    if (succeeded % 50 === 0) {
      console.log(`  ${succeeded}/${candidates.length} 완료...`);
    }
  } catch (e) {
    await conn.rollback();
    failed++;
    console.error(`  실패 user=${c.id} email=${c.email}:`, e.message);
  }
}

console.log(`\n완료 — 성공 ${succeeded}, 실패 ${failed}`);
await conn.end();
