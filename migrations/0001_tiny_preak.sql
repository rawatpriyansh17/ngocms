CREATE TABLE `latest_event` (
	`id` integer PRIMARY KEY NOT NULL,
	`image_url` text,
	`image_alt` text DEFAULT 'Upcoming program flyer',
	`is_active` integer DEFAULT false,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
