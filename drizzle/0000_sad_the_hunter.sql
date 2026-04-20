CREATE TABLE `books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`title` text NOT NULL,
	`age` integer NOT NULL,
	`cefr` text NOT NULL,
	`topic` text,
	`cover_image_path` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `books_profile_idx` ON `books` (`profile_id`);--> statement-breakpoint
CREATE INDEX `books_level_idx` ON `books` (`age`,`cefr`);--> statement-breakpoint
CREATE TABLE `passages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`order_index` integer NOT NULL,
	`text_en` text NOT NULL,
	`text_ko` text NOT NULL,
	`audio_path` text,
	`scene_image_path` text,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `passages_book_order_idx` ON `passages` (`book_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`avatar` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`order_index` integer NOT NULL,
	`question` text NOT NULL,
	`choices` text NOT NULL,
	`answer_index` integer NOT NULL,
	`explanation` text,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quizzes_book_order_idx` ON `quizzes` (`book_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `reading_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`book_id` integer NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`finished_at` integer,
	`progress_ratio` real DEFAULT 0 NOT NULL,
	`quiz_score` integer,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `logs_profile_idx` ON `reading_logs` (`profile_id`);--> statement-breakpoint
CREATE INDEX `logs_book_idx` ON `reading_logs` (`book_id`);