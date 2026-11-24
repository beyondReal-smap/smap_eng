# 마이그레이션 정합성·IAP 복구 절차

## 결정 사항

### 0012~0017 마이그레이션

`0016_push_fcm.sql`과 `0016_push_platform.sql`은 같은 번호로 같은 `platform` 컬럼을 추가하므로 둘을 순서대로 실행할 수 없습니다. 운영 DB에는 0012~0017 일부 또는 전부가 수동 적용됐을 수 있어 기존 파일을 수정하거나 다시 저널에 올리면 신규·기적용 환경 중 한쪽이 실패합니다.

따라서 기존 파일은 감사 추적용 역사 파일로 그대로 보존하고, Drizzle 실행 저널에는 `0018_reconcile_post_0011.sql`만 추가했습니다. 0018은 `information_schema`로 각 컬럼·인덱스·외래 키를 확인하고 없는 DDL만 실행하며, 신규 환경에는 0012~0017의 최종 스키마를 직접 만듭니다.

### FCM 토큰 길이

최종 길이는 `VARCHAR(512)`입니다. 현재 FCM 등록 토큰은 보통 약 150자이지만 Firebase는 고정 최대 길이를 계약하지 않으며, 공식 오류 지침도 서버가 받은 토큰을 자르지 말라고 명시합니다. 따라서 255는 현재 관측값에는 충분해도 장기 계약으로 삼기 어렵고, API 검증 상한과 Drizzle 스키마가 이미 사용하는 512로 통일했습니다. 출처: [Firebase FCM 오류 코드 — 등록 토큰을 자르지 말 것](https://firebase.google.com/docs/reference/fcm/rest/v1/ErrorCode)

### IAP 지급 원자성

새 지급 흐름은 다음 네 작업을 하나의 MySQL 트랜잭션으로 커밋합니다.

1. `iap_transactions`에 검증 거래를 `status='verified'`로 기록합니다.
2. `credit_balances` 행을 `FOR UPDATE`로 잠그고 잔액·누적 충전을 올립니다.
3. `credit_transactions`에 `kind='purchase'` 원장을 기록하고 `iap_transaction_id`를 연결합니다.
4. IAP 상태를 `granted`로 바꿉니다.

중간 오류가 나면 거래 기록까지 전부 롤백되므로 같은 영수증 재시도가 다시 지급을 시도합니다. 성공 후 재시도는 `transaction_id`와 `credit_tx_iap_idx`의 두 UNIQUE 제약으로 중복 지급 없이 기존 `{ granted: false, idempotent: true }` 응답을 반환합니다.

0018 이전 `status='verified'` 행은 성공 지급과 실패 지급을 구분할 연결 키가 없습니다. 중복 지급 0건 원칙 때문에 서버가 이 행을 자동 재지급하지 않으며, 아래 조회로 후보를 좁힌 뒤 결제·고객 기록을 대조해 수동 판정해야 합니다. 미지급으로 확정한 행만 `pending_grant`로 전환하면 동일 사용자의 영수증 재시도가 원자 지급을 실행합니다.

## 기존 미지급 후보 조회

다음 SQL은 읽기 전용입니다. 첫 조회는 0018 이후에도 `verified`로 남아 있는 모든 레거시 검토 대상을 반환합니다.

```sql
SELECT
  i.id,
  i.user_id,
  i.platform,
  i.transaction_id,
  i.product_id,
  i.stars,
  i.environment,
  i.verified_at,
  i.created_at
FROM iap_transactions AS i
LEFT JOIN credit_transactions AS c
  ON c.iap_transaction_id = i.id
WHERE i.status = 'verified'
  AND c.id IS NULL
ORDER BY i.created_at ASC;
```

아래 조회는 구 구현의 `grant` 원장이 IAP 검증 직후 생성됐는지 확인해 미지급 가능성이 큰 행을 좁힙니다. 관리자 수동 지급과 시각이 겹칠 수 있으므로 결과만으로 자동 지급하면 안 됩니다.

```sql
SELECT
  i.id,
  i.user_id,
  i.transaction_id,
  i.product_id,
  i.stars,
  i.created_at,
  COUNT(c.id) AS nearby_legacy_grant_count
FROM iap_transactions AS i
LEFT JOIN credit_transactions AS c
  ON c.user_id = i.user_id
 AND c.kind = 'grant'
 AND c.delta = i.stars
 AND c.created_at BETWEEN i.created_at AND DATE_ADD(i.created_at, INTERVAL 10 SECOND)
WHERE i.status = 'verified'
GROUP BY
  i.id,
  i.user_id,
  i.transaction_id,
  i.product_id,
  i.stars,
  i.created_at
HAVING nearby_legacy_grant_count = 0
ORDER BY i.created_at ASC;
```

미지급이 확정된 단일 행은 운영 승인 후 다음처럼 복구 대기 상태로 전환합니다. `id`와 `transaction_id`를 함께 제한하고, 성공 지급 여부가 불확실한 행에는 실행하지 않습니다.

```sql
UPDATE iap_transactions
SET status = 'pending_grant'
WHERE id = :confirmed_unpaid_id
  AND transaction_id = :confirmed_transaction_id
  AND status = 'verified';
```

그 뒤 원래 구매 계정에서 같은 영수증으로 `/api/iap/verify`를 재시도합니다. 서버는 사용자·플랫폼·상품·별 수·환경이 기존 행과 모두 일치할 때만 지급하고 `granted`로 바꿉니다.

## 대표님 수동 적용 순서

1. IAP 검증 요청이 들어오지 않도록 앱을 유지보수 상태로 전환하고 DB 백업을 완료합니다.
2. 배포 대상 커밋에서 `DATABASE_URL='...' node scripts/check-schema-drift.mjs`를 실행합니다. 마이그레이션 전에는 `migration_journal_mismatch`와 누락 항목이 나오는 것이 정상입니다.
3. `__drizzle_migrations`의 최신 `created_at`이 `1778629200000`(0011)인지 확인합니다. 값이 다르거나 테이블이 없으면 `pnpm db:migrate`를 실행하지 말고 DBA가 먼저 저널 기준점을 확인해야 합니다.
4. `DATABASE_URL='...' pnpm db:migrate`를 한 번 실행합니다. 0018이 기존 상태를 검사해 필요한 DDL만 적용합니다.
5. `DATABASE_URL='...' node scripts/check-schema-drift.mjs`를 다시 실행하고 `ok: true`, `latestMigrationAt: 1787055203659`를 확인합니다.
6. 새 서버 코드를 배포·재기동한 뒤 유지보수 상태를 해제합니다. 마이그레이션과 서버 재기동 사이에는 구 버전 IAP 요청을 허용하지 않습니다.
7. 위 미지급 후보 조회를 실행하고 스토어 거래·고객 문의·원장 시각을 대조합니다. 확정된 미지급 건만 `pending_grant`로 전환한 뒤 원래 구매 계정에서 영수증 재시도를 요청하고, 성공 지급 건은 재지급하지 않습니다.

## 네이티브 API 계약 확인

- `GET /api/books/{id}/pack`: 소유권 확인 후 `book`, `passages`, 실제 파일이 존재하는 `media[{ path, bytes, etagOrSha }]`를 반환합니다. `etagOrSha`는 기존 정적 미디어 라우트와 같은 `size+mtime` 약한 ETag이며 각 파일은 기존 `private, max-age=3600` 계약으로 내려받습니다.
- `GET /api/logs?profileId=&bookId=`: `bookId`가 없으면 기존 프로필 전체 목록, 있으면 같은 프로필·책의 로그 목록만 반환합니다.
- 푸시 `custom`: `kind`, `bookId?`, `profileId?`만 전송합니다. 확정한 종류는 `book_created`, `weekly_report`, `iap_purchase`, `admin_message`입니다.
- `GET /api/books/{id}`: 기존 전체 `book` 조회가 `alternateEnding`, `endingAudioPathsA`, `endingAudioPathsB`, `funFacts`, `genre`를 이미 포함하므로 변경하지 않았습니다.
