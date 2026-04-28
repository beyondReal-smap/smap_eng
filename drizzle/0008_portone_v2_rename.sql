-- 토스페이먼츠 직결 → 포트원 V2 마이그레이션.
-- 컬럼명을 PG-agnostic 으로 정리(rename) — 데이터 보존(DROP/ADD 아님).
--
-- 기존 토스 데이터(toss_order_id/toss_payment_key/toss_method)는 컬럼이름만 바뀌고
-- 값은 그대로 보존된다. 포트원 V2 paymentId 규격(영문/숫자/-/_ 6~64자)이
-- 우리가 발급해 오던 UUID v4(36자)와 호환되므로 신규 결제도 같은 컬럼에 누적 가능.
-- confirm 시 포트원 응답의 `transactionId`가 pg_tx_id로 들어간다.

ALTER TABLE `orders`
  RENAME COLUMN `toss_order_id` TO `payment_id`;

ALTER TABLE `orders`
  RENAME COLUMN `toss_payment_key` TO `pg_tx_id`;

ALTER TABLE `orders`
  RENAME COLUMN `toss_method` TO `pay_method`;
