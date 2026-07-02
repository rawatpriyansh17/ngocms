import { sql } from 'drizzle-orm';
import {
  customType,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const f32Embedding = customType<{ data: string }>({
  dataType() {
    return 'F32_BLOB(1536)';
  },
});

// Posts table for PostSection component
export const postsTable = sqliteTable('posts', {
  id: integer('id').primaryKey(),
  title_en: text('title_en').notNull(),
  description_en: text('description_en').notNull(),
  mediaType: text('media_type').notNull(), // 'image' or 'video'
  mediaUrl: text('media_url').notNull(), // ImageKit URL
  thumbnailUrl: text('thumbnail_url'), // For videos
  eventPageSlug: text('event_page_slug'), // Links to event page
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  order: integer('order').default(0),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// Events table for event pages
export const eventsTable = sqliteTable('events', {
  id: integer('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  heading_en: text('heading_en').notNull(),
  description1_en: text('description1_en').notNull(),
  description2_en: text('description2_en').notNull(),
  photoSubheading_en: text('photo_subheading_en').default('Photo/News Coverage:-'),
  videoSubheading_en: text('video_subheading_en').default('Video Coverage:-'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// Media table for photos and videos in events
export const mediaTable = sqliteTable('media', {
  id: integer('id').primaryKey(),
  eventId: integer('event_id').references(() => eventsTable.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'photo' or 'video'
  url: text('url').notNull(), // ImageKit URL
  thumbnailUrl: text('thumbnail_url'), // For videos
  heading_en: text('heading_en'),
  description_en: text('description_en'),
  videoType: text('video_type'), // 'interview' or 'distribution' for videos
  order: integer('order').default(0),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// Site-wide upcoming program flyer shown on the public latest-event page
export const latestEventTable = sqliteTable('latest_event', {
  id: integer('id').primaryKey(),
  imageUrl: text('image_url'),
  imageAlt: text('image_alt').default('Upcoming program flyer'),
  isActive: integer('is_active', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const contentEmbeddingsTable = sqliteTable(
  'content_embeddings',
  {
    id: integer('id').primaryKey(),
    sourceType: text('source_type').notNull(),
    sourceId: integer('source_id'),
    sourceSlug: text('source_slug'),
    chunkIndex: integer('chunk_index').notNull().default(0),
    sourceHash: text('source_hash').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    url: text('url').notNull(),
    metadata: text('metadata').default('{}').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    embedding: f32Embedding('embedding').notNull(),
    createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  },
  (table) => [
    uniqueIndex('content_embeddings_source_chunk_hash_idx').on(
      table.sourceType,
      table.sourceId,
      table.sourceSlug,
      table.chunkIndex,
      table.sourceHash
    ),
    index('content_embeddings_source_idx').on(
      table.sourceType,
      table.sourceId,
      table.sourceSlug
    ),
    index('content_embeddings_active_idx').on(table.isActive),
  ]
);

// Types
export type InsertPost = typeof postsTable.$inferInsert;
export type SelectPost = typeof postsTable.$inferSelect;
export type InsertEvent = typeof eventsTable.$inferInsert;
export type SelectEvent = typeof eventsTable.$inferSelect;
export type InsertMedia = typeof mediaTable.$inferInsert;
export type SelectMedia = typeof mediaTable.$inferSelect;
export type InsertLatestEvent = typeof latestEventTable.$inferInsert;
export type SelectLatestEvent = typeof latestEventTable.$inferSelect;
export type SelectContentEmbedding = typeof contentEmbeddingsTable.$inferSelect;
