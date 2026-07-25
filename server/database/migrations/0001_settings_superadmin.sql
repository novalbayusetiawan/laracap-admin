CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
ALTER TABLE `users` ADD `is_superadmin` integer DEFAULT false NOT NULL;