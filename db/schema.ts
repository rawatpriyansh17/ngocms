import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Posts table for PostSection component
export const postsTable = sqliteTable('posts', {
  id: integer('id').primaryKey(),
  title_en: text('title_en').notNull(),
  title_hi: text('title_hi').notNull(),
  description_en: text('description_en').notNull(),
  description_hi: text('description_hi').notNull(),
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
  heading_hi: text('heading_hi').notNull(),
  description1_en: text('description1_en').notNull(),
  description1_hi: text('description1_hi').notNull(),
  description2_en: text('description2_en').notNull(),
  description2_hi: text('description2_hi').notNull(),
  photoSubheading_en: text('photo_subheading_en').default('Photo/News Coverage:-'),
  photoSubheading_hi: text('photo_subheading_hi').default('फोटो/समाचार कवरेज:-'),
  videoSubheading_en: text('video_subheading_en').default('Video Coverage:-'),
  videoSubheading_hi: text('video_subheading_hi').default('वीडियो कवरेज:-'),
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
  heading_hi: text('heading_hi'),
  description_en: text('description_en'),
  description_hi: text('description_hi'),
  videoType: text('video_type'), // 'interview' or 'distribution' for videos
  order: integer('order').default(0),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// Types
export type InsertPost = typeof postsTable.$inferInsert;
export type SelectPost = typeof postsTable.$inferSelect;
export type InsertEvent = typeof eventsTable.$inferInsert;
export type SelectEvent = typeof eventsTable.$inferSelect;
export type InsertMedia = typeof mediaTable.$inferInsert;
export type SelectMedia = typeof mediaTable.$inferSelect;
