-- iap_transactions 에 platform 컬럼 추가 (Android Play Billing 통합).
--
-- iOS StoreKit 2 transactionId 는 64자 이내 숫자 문자열이지만, Android Play purchase token
-- 은 base64 ~ 300자 가변. transaction_id 컬럼을 확장한다.
ALTER TABLE `iap_transactions`
  ADD COLUMN `platform` VARCHAR(16) NOT NULL DEFAULT 'ios' AFTER `user_id`;

ALTER TABLE `iap_transactions`
  MODIFY COLUMN `transaction_id` VARCHAR(255) NOT NULL;

-- environment 의미:
--   - ios:     'production' | 'sandbox'   (TestFlight + Sandbox)
--   - android: 'production' (Play Billing 은 라이선스 테스터로 분기, environment 필드 미사용)
