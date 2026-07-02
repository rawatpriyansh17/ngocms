CREATE TABLE `content_embeddings` (
	`id` integer PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`source_id` integer,
	`source_slug` text,
	`chunk_index` integer DEFAULT 0 NOT NULL,
	`source_hash` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`url` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`embedding` F32_BLOB(1536) NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_embeddings_source_chunk_hash_idx` ON `content_embeddings` (`source_type`,`source_id`,`source_slug`,`chunk_index`,`source_hash`);--> statement-breakpoint
CREATE INDEX `content_embeddings_source_idx` ON `content_embeddings` (`source_type`,`source_id`,`source_slug`);--> statement-breakpoint
CREATE INDEX `content_embeddings_active_idx` ON `content_embeddings` (`is_active`);--> statement-breakpoint
CREATE INDEX `content_embeddings_embedding_idx` ON `content_embeddings` (libsql_vector_idx(`embedding`));
