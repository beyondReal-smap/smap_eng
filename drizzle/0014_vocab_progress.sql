-- 단어 학습 진도 + 이벤트 로그.
--
-- 두 테이블 모두 (profileId, wordKey) 단위. COPPA Level-1 정책에 맞춰 단어 키 외 식별 정보는 저장 안 함.
--  - vocab_progress: 단어별 현재 SRS 상태 스냅샷 (UPSERT)
--  - vocab_grade_log: 평가 한 번에 한 줄, 일자별 학습 그래프/추이 분석용

CREATE TABLE `vocab_progress` (
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

CREATE TABLE `vocab_grade_log` (
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
