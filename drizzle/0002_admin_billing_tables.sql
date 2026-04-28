CREATE TABLE `credit_balances` (
	`user_id` varchar(255) NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`total_purchased` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_balances_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `credit_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`delta` int NOT NULL,
	`package_id` varchar(16),
	`book_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `credit_balances` ADD CONSTRAINT `credit_balances_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_transactions_book_id_books_id_fk` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `credit_tx_user_idx` ON `credit_transactions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `credit_tx_book_idx` ON `credit_transactions` (`book_id`);