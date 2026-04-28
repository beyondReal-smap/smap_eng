#!/usr/bin/env node
/**
 * 사전 grant 정책 결정용 read-only 조사 스크립트.
 *
 * 출력:
 *  1) 전체 가입자 수 / 자녀 프로필 보유 가족 수 / 책 1권 이상 만든 가족 수
 *  2) 잔액 0인 활성 가족(프로필 보유) 목록 — id/email/프로필수/누적 책수/누적 구매
 *  3) 잔액별 분포 히스토그램
 *
 * DB 변경 없음. DATABASE_URL 환경변수 필요.
 *
 * 사용:
 *   DATABASE_URL=mysql://... node scripts/credits-survey.mjs
 */
import { createConnection } from 'mysql2/promise';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await createConnection(process.env.DATABASE_URL);

// 1) 전체 통계
const [[totals]] = await conn.execute(`
  SELECT
    (SELECT COUNT(*) FROM users)                                                   AS total_users,
    (SELECT COUNT(DISTINCT user_id) FROM profiles)                                  AS users_with_profile,
    (SELECT COUNT(DISTINCT p.user_id) FROM books b JOIN profiles p ON b.profile_id = p.id) AS users_with_book,
    (SELECT COUNT(*) FROM credit_balances WHERE balance > 0)                        AS users_with_balance
`);

console.log('\n=== 전체 통계 ===');
console.table(totals);

// 2) 잔액 분포 히스토그램 (활성 가족 = 프로필 보유)
const [bins] = await conn.execute(`
  SELECT
    bucket,
    COUNT(*) AS n
  FROM (
    SELECT
      CASE
        WHEN COALESCE(cb.balance, 0) = 0 THEN '0'
        WHEN cb.balance BETWEEN 1 AND 4   THEN '1-4'
        WHEN cb.balance BETWEEN 5 AND 9   THEN '5-9'
        WHEN cb.balance BETWEEN 10 AND 49 THEN '10-49'
        ELSE '50+'
      END AS bucket
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    LEFT JOIN credit_balances cb ON cb.user_id = u.id
    GROUP BY u.id, cb.balance
  ) t
  GROUP BY bucket
  ORDER BY FIELD(bucket, '0', '1-4', '5-9', '10-49', '50+')
`);

console.log('\n=== 활성 가족(프로필 보유) 잔액 분포 ===');
console.table(bins);

// 3) 잔액 0 활성 가족 후보 — 정책 결정용 상세 목록
const [candidates] = await conn.execute(`
  SELECT
    u.id,
    u.email,
    u.name,
    COUNT(DISTINCT p.id)                       AS profile_count,
    (SELECT COUNT(*)
       FROM books b
       JOIN profiles p2 ON p2.id = b.profile_id
       WHERE p2.user_id = u.id)                AS total_books_created,
    COALESCE(cb.balance, 0)                    AS balance,
    COALESCE(cb.total_purchased, 0)            AS total_purchased,
    DATE_FORMAT(u.created_at, '%Y-%m-%d')   AS signed_up_at
  FROM users u
  JOIN profiles p ON p.user_id = u.id
  LEFT JOIN credit_balances cb ON cb.user_id = u.id
  WHERE COALESCE(cb.balance, 0) = 0
  GROUP BY u.id, u.email, u.name, cb.balance, cb.total_purchased, u.created_at
  ORDER BY total_books_created DESC, u.created_at ASC
`);

console.log(`\n=== 잔액 0 활성 가족 후보 (${candidates.length}명) ===`);
if (candidates.length > 0) {
  console.table(candidates);
} else {
  console.log('(해당 없음 — 모든 활성 가족이 별을 보유 중)');
}

await conn.end();
