-- Apple StoreKit 2 In-App Purchase 거래 기록.
--
-- 토스 결제(`orders`)와 분리된 별도 테이블. iOS 빌드 전용 결제 경로이며,
-- App Store Review Guideline 3.1.1에 따라 디지털 콘텐츠(별)는 IAP만 사용.
--
-- 중복 grant 방지:
--   - `transaction_id` UNIQUE — 같은 영수증 재전송 시 INSERT 거절 → grantCredits 스킵
--   - `verified_at`은 검증 완료 시각 (서버 시계)
--
-- 환불 처리:
--   - Apple App Store Server Notifications(추후 도입)이 REFUND 통지를 보내면
--     `status='refunded'`로 업데이트하고 별도 `credit_transactions.refund` 처리

CREATE TABLE `iap_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(255) NOT NULL,
  -- StoreKit 2 transactionId (또는 originalTransactionId). 영수증 단위 unique.
  `transaction_id` VARCHAR(64) NOT NULL,
  -- iOS Product ID (예: site.smap.harubook.star_small).
  `product_id` VARCHAR(128) NOT NULL,
  -- 적립된 별 개수 — IAP_PRODUCT_MAPPING 기반.
  `stars` INT NOT NULL,
  -- 'production' | 'sandbox'.
  `environment` VARCHAR(16) NOT NULL,
  -- JWS payload의 signedDate (epoch ms를 ms 정밀도 timestamp로).
  `signed_at` TIMESTAMP NULL,
  -- 검증 + grantCredits 완료 시각.
  `verified_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- 'verified' | 'refunded'.
  `status` VARCHAR(16) NOT NULL DEFAULT 'verified',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- 영수증 단위 unique — 같은 transaction_id로 두 번 grant 금지.
  UNIQUE KEY `iap_tx_id_uniq` (`transaction_id`),
  KEY `iap_tx_user_idx` (`user_id`, `created_at`),
  CONSTRAINT `iap_tx_user_fk` FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
