-- APNs device token 저장.
--
-- 같은 디바이스가 user 변경하거나 토큰을 재발급하는 경우를 모두 다룬다:
--   - device_token UNIQUE — 같은 디바이스 1행만
--   - user_id 변경 시 UPDATE (다른 사용자가 같은 기기에 로그인)
--   - 로그아웃 시 DELETE (POST /api/push/unregister)
--   - APNs가 410 Unregistered 응답하면 자동 정리(별도 cron)

CREATE TABLE `push_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(255) NOT NULL,
  -- APNs device token (hex). 길이는 일반적으로 64자, 향후 변경 대비 200.
  `device_token` VARCHAR(200) NOT NULL,
  -- 'production' | 'sandbox' — APNs 서버 분기에 사용.
  `environment` VARCHAR(16) NOT NULL DEFAULT 'production',
  `last_seen_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `push_token_uniq` (`device_token`),
  KEY `push_token_user_idx` (`user_id`),
  CONSTRAINT `push_token_user_fk` FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
