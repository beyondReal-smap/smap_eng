CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`package_id` varchar(16) NOT NULL,
	`amount` int NOT NULL,
	`stars` int NOT NULL,
	`toss_order_id` varchar(64) NOT NULL,
	`toss_payment_key` varchar(200),
	`toss_method` varchar(32),
	`receipt_url` varchar(500),
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`failure_code` varchar(64),
	`confirmed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_toss_order_id_unique` UNIQUE(`toss_order_id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);