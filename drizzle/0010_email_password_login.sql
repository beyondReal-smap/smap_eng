-- 이메일/비밀번호 로그인 지원.
--
-- Auth.js OAuth users 테이블을 그대로 사용하되, 자체 이메일 계정에만
-- scrypt password hash를 nullable 컬럼으로 저장한다. 기존 OAuth 계정은 영향 없음.

ALTER TABLE `users`
  ADD COLUMN `password_hash` varchar(255) NULL;
--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);
