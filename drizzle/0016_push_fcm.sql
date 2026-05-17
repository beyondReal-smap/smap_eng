-- FCM 통합: push_tokens의 device_token을 FCM registration token으로 의미 변경.
-- FCM 토큰은 ~150자 + 여유분 → varchar(512). 기존 APNs hex(64자)는 그대로 fit.
-- platform 컬럼 신설 — 기존 행은 모두 iOS에서 생성됐으므로 default 'ios'.
ALTER TABLE `push_tokens`
  MODIFY `device_token` varchar(512) NOT NULL,
  ADD COLUMN `platform` varchar(16) NOT NULL DEFAULT 'ios' AFTER `device_token`;

CREATE INDEX `push_token_platform_idx` ON `push_tokens` (`platform`);

-- 관리자 푸시 발송 감사 로그.
CREATE TABLE `push_send_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actor_user_id` varchar(255) NOT NULL,
  `audience` varchar(32) NOT NULL,
  `target_user_id` varchar(255) DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `body` text NOT NULL,
  `deep_link` varchar(500) DEFAULT NULL,
  `audience_count` int NOT NULL DEFAULT 0,
  `send_count` int NOT NULL DEFAULT 0,
  `success_count` int NOT NULL DEFAULT 0,
  `failure_count` int NOT NULL DEFAULT 0,
  `status` varchar(16) NOT NULL DEFAULT 'queued',
  `error_message` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `push_send_logs_actor_fk`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE INDEX `push_send_logs_actor_idx` ON `push_send_logs` (`actor_user_id`);
CREATE INDEX `push_send_logs_created_idx` ON `push_send_logs` (`created_at`);
