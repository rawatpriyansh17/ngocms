CREATE TABLE `events` (
	`id` integer PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`heading_en` text NOT NULL,
	`description1_en` text NOT NULL,
	`description2_en` text NOT NULL,
	`photo_subheading_en` text DEFAULT 'Photo/News Coverage:-',
	`video_subheading_en` text DEFAULT 'Video Coverage:-',
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY NOT NULL,
	`event_id` integer,
	`type` text NOT NULL,
	`url` text NOT NULL,
	`thumbnail_url` text,
	`heading_en` text,
	`description_en` text,
	`video_type` text,
	`order` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY NOT NULL,
	`title_en` text NOT NULL,
	`description_en` text NOT NULL,
	`media_type` text NOT NULL,
	`media_url` text NOT NULL,
	`thumbnail_url` text,
	`event_page_slug` text,
	`is_active` integer DEFAULT true,
	`order` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
