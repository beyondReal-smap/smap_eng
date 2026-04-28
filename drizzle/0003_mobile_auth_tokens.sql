CREATE TABLE `mobile_auth_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`kind` varchar(20) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`consumed_at` timestamp,
	`revoked_at` timestamp,
	`last_used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mobile_auth_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `mobile_auth_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `mobile_auth_tokens` ADD CONSTRAINT `mobile_auth_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mobile_auth_tokens_user_kind_idx` ON `mobile_auth_tokens` (`user_id`,`kind`);--> statement-breakpoint
CREATE INDEX `mobile_auth_tokens_expires_idx` ON `mobile_auth_tokens` (`expires_at`);