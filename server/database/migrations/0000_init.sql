CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`bundle_limit` integer,
	`user_id` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_uuid_unique` ON `applications` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `applications_slug_unique` ON `applications` (`slug`);--> statement-breakpoint
CREATE TABLE `bundles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text,
	`description` text,
	`size` integer NOT NULL,
	`file_path` text NOT NULL,
	`application_id` integer NOT NULL,
	`channel_id` integer,
	`android_min_version_code` integer,
	`android_max_version_code` integer,
	`android_eq_version_code` integer,
	`ios_min_version_code` integer,
	`ios_max_version_code` integer,
	`ios_eq_version_code` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bundles_uuid_unique` ON `bundles` (`uuid`);--> statement-breakpoint
CREATE INDEX `bundles_channel_created_idx` ON `bundles` (`channel_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `bundles_application_idx` ON `bundles` (`application_id`);--> statement-breakpoint
CREATE TABLE `channels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`application_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channels_uuid_unique` ON `channels` (`uuid`);--> statement-breakpoint
CREATE TABLE `device_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` integer NOT NULL,
	`application_id` integer,
	`bundle_id` integer,
	`ip_address` text,
	`user_agent` text,
	`country` text,
	`city` text,
	`os_version` text,
	`device_model` text,
	`type` text DEFAULT 'check' NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`bundle_id`) REFERENCES `bundles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `device_logs_device_idx` ON `device_logs` (`device_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_identifier` text NOT NULL,
	`platform` text,
	`bundle_id` integer,
	`last_active_at` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`bundle_id`) REFERENCES `bundles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_device_identifier_unique` ON `devices` (`device_identifier`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`email` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `personal_access_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tokenable_type` text NOT NULL,
	`tokenable_id` integer NOT NULL,
	`name` text NOT NULL,
	`token` text NOT NULL,
	`abilities` text,
	`last_used_at` text,
	`expires_at` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personal_access_tokens_token_unique` ON `personal_access_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `pat_tokenable_idx` ON `personal_access_tokens` (`tokenable_type`,`tokenable_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`ip_address` text,
	`user_agent` text,
	`payload` text NOT NULL,
	`last_activity` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified_at` text,
	`password` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`remember_token` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);