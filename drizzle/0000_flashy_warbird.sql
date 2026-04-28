CREATE TABLE `accounts` (
	`userId` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`provider` varchar(255) NOT NULL,
	`providerAccountId` varchar(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` int,
	`token_type` varchar(255),
	`scope` varchar(255),
	`id_token` text,
	`session_state` varchar(255),
	CONSTRAINT `accounts_provider_providerAccountId_pk` PRIMARY KEY(`provider`,`providerAccountId`)
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profile_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`age` int NOT NULL,
	`cefr` varchar(2) NOT NULL,
	`topic` varchar(255),
	`cover_image_path` varchar(500),
	`vocabulary` json,
	`alternate_ending` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`flagged_at` timestamp,
	`flagged_reason` varchar(500),
	CONSTRAINT `books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `passages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`book_id` int NOT NULL,
	`order_index` int NOT NULL,
	`text_en` text NOT NULL,
	`text_ko` text NOT NULL,
	`audio_path` varchar(500),
	`scene_image_path` varchar(500),
	CONSTRAINT `passages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`name` varchar(100) NOT NULL,
	`age` int NOT NULL DEFAULT 7,
	`avatar` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`book_id` int NOT NULL,
	`order_index` int NOT NULL,
	`question` text NOT NULL,
	`choices` json NOT NULL,
	`answer_index` int NOT NULL,
	`explanation` text,
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reading_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profile_id` int NOT NULL,
	`book_id` int NOT NULL,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`finished_at` timestamp,
	`progress_ratio` double NOT NULL DEFAULT 0,
	`quiz_score` int,
	CONSTRAINT `reading_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`sessionToken` varchar(255) NOT NULL,
	`userId` varchar(255) NOT NULL,
	`expires` timestamp NOT NULL,
	CONSTRAINT `sessions_sessionToken` PRIMARY KEY(`sessionToken`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`cycle_anchor_day` int NOT NULL,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255),
	`email` varchar(255),
	`emailVerified` timestamp(3),
	`image` varchar(2048),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verificationTokens` (
	`identifier` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires` timestamp NOT NULL,
	CONSTRAINT `verificationTokens_identifier_token_pk` PRIMARY KEY(`identifier`,`token`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `books` ADD CONSTRAINT `books_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `passages` ADD CONSTRAINT `passages_book_id_books_id_fk` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_book_id_books_id_fk` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reading_logs` ADD CONSTRAINT `reading_logs_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reading_logs` ADD CONSTRAINT `reading_logs_book_id_books_id_fk` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `books_profile_idx` ON `books` (`profile_id`);--> statement-breakpoint
CREATE INDEX `books_level_idx` ON `books` (`age`,`cefr`);--> statement-breakpoint
CREATE INDEX `passages_book_order_idx` ON `passages` (`book_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `profiles_user_idx` ON `profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `quizzes_book_order_idx` ON `quizzes` (`book_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `logs_profile_idx` ON `reading_logs` (`profile_id`);--> statement-breakpoint
CREATE INDEX `logs_book_idx` ON `reading_logs` (`book_id`);