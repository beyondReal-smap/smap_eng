-- 0012~0017 역사 마이그레이션은 운영 환경에서 수동 적용됐을 가능성이 있고,
-- 0016 두 파일은 같은 컬럼을 중복 추가한다. 기존 파일은 감사 추적용으로 보존하되
-- 실행 저널에는 이 조건부 통합 마이그레이션만 등록한다.
--
-- 모든 분기는 information_schema로 현재 상태를 확인한 뒤 필요한 DDL만 실행한다.
-- 따라서 0011 이후 신규 환경과 0012~0017 일부/전체가 이미 적용된 환경 모두에서
-- 같은 최종 스키마로 수렴한다.

CREATE TABLE IF NOT EXISTS `iap_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(255) NOT NULL,
  `platform` VARCHAR(16) NOT NULL DEFAULT 'ios',
  `transaction_id` VARCHAR(255) NOT NULL,
  `product_id` VARCHAR(128) NOT NULL,
  `stars` INT NOT NULL,
  `environment` VARCHAR(16) NOT NULL,
  `signed_at` TIMESTAMP NULL,
  `verified_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(16) NOT NULL DEFAULT 'verified',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `iap_tx_id_uniq` (`transaction_id`),
  KEY `iap_tx_user_idx` (`user_id`, `created_at`),
  CONSTRAINT `iap_tx_user_fk` FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `push_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(255) NOT NULL,
  `device_token` VARCHAR(512) NOT NULL,
  `platform` VARCHAR(16) NOT NULL DEFAULT 'ios',
  `environment` VARCHAR(16) NOT NULL DEFAULT 'production',
  `last_seen_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `push_token_uniq` (`device_token`),
  KEY `push_token_user_idx` (`user_id`),
  KEY `push_token_platform_idx` (`platform`),
  CONSTRAINT `push_token_user_fk` FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `vocab_progress` (
  `profile_id` INT NOT NULL,
  `word_key` VARCHAR(80) NOT NULL,
  `level` INT NOT NULL DEFAULT 0,
  `due_at_ms` DOUBLE NOT NULL DEFAULT 0,
  `last_graded_at_ms` DOUBLE NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_id`, `word_key`),
  KEY `vocab_progress_profile_idx` (`profile_id`),
  CONSTRAINT `vocab_progress_profile_fk` FOREIGN KEY (`profile_id`)
    REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `vocab_grade_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `profile_id` INT NOT NULL,
  `word_key` VARCHAR(80) NOT NULL,
  `grade` VARCHAR(8) NOT NULL,
  `prev_level` INT NOT NULL,
  `next_level` INT NOT NULL,
  `graded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `vocab_log_profile_at_idx` (`profile_id`, `graded_at`),
  KEY `vocab_log_word_idx` (`profile_id`, `word_key`),
  CONSTRAINT `vocab_log_profile_fk` FOREIGN KEY (`profile_id`)
    REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `push_send_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `actor_user_id` VARCHAR(255) NOT NULL,
  `audience` VARCHAR(32) NOT NULL,
  `target_user_id` VARCHAR(255) DEFAULT NULL,
  `title` VARCHAR(200) DEFAULT NULL,
  `body` TEXT NOT NULL,
  `deep_link` VARCHAR(500) DEFAULT NULL,
  `audience_count` INT NOT NULL DEFAULT 0,
  `send_count` INT NOT NULL DEFAULT 0,
  `success_count` INT NOT NULL DEFAULT 0,
  `failure_count` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(16) NOT NULL DEFAULT 'queued',
  `error_message` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `push_send_logs_actor_idx` (`actor_user_id`),
  KEY `push_send_logs_created_idx` (`created_at`),
  CONSTRAINT `push_send_logs_actor_fk` FOREIGN KEY (`actor_user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint

SET @ddl = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `profiles` ADD COLUMN `deleted_at` TIMESTAMP NULL DEFAULT NULL',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'profiles'
    AND COLUMN_NAME = 'deleted_at'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

SET @ddl = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `push_tokens` ADD COLUMN `platform` VARCHAR(16) NOT NULL DEFAULT ''ios'' AFTER `device_token`',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'push_tokens'
    AND COLUMN_NAME = 'platform'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

ALTER TABLE `push_tokens`
  MODIFY COLUMN `device_token` VARCHAR(512) NOT NULL;
--> statement-breakpoint

SET @ddl = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX `push_token_platform_idx` ON `push_tokens` (`platform`)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'push_tokens'
    AND INDEX_NAME = 'push_token_platform_idx'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

SET @ddl = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `iap_transactions` ADD COLUMN `platform` VARCHAR(16) NOT NULL DEFAULT ''ios'' AFTER `user_id`',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'iap_transactions'
    AND COLUMN_NAME = 'platform'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

ALTER TABLE `iap_transactions`
  MODIFY COLUMN `transaction_id` VARCHAR(255) NOT NULL;
--> statement-breakpoint

SET @ddl = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `credit_transactions` ADD COLUMN `iap_transaction_id` INT NULL AFTER `reversed_tx_id`',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'credit_transactions'
    AND COLUMN_NAME = 'iap_transaction_id'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

SET @ddl = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE UNIQUE INDEX `credit_tx_iap_idx` ON `credit_transactions` (`iap_transaction_id`)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'credit_transactions'
    AND INDEX_NAME = 'credit_tx_iap_idx'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

SET @ddl = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_tx_iap_fk` FOREIGN KEY (`iap_transaction_id`) REFERENCES `iap_transactions` (`id`) ON DELETE SET NULL',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'credit_transactions'
    AND CONSTRAINT_NAME = 'credit_tx_iap_fk'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
