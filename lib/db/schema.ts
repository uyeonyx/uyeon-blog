import { sql } from 'drizzle-orm'
import {
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

export const postStatusEnum = pgEnum('post_status', ['draft', 'published', 'archived'])

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    status: postStatusEnum('status').notNull().default('draft'),
    tags: text('tags').array().notNull().default([]),
    layout: text('layout'), // PostLayout | PostSimple | PostBanner (null = default)
    images: jsonb('images'),
    date: timestamp('date', { withTimezone: true }),
    lastmod: timestamp('lastmod', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_posts_status_date').on(table.status, table.date)]
)

export const postTranslations = pgTable(
  'post_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    language: text('language').notNull(),
    title: text('title').notNull().default(''),
    summary: text('summary'),
    contentJson: jsonb('content_json'), // Tiptap(ProseMirror) 문서 — 편집 source of truth
    contentMd: text('content_md').notNull().default(''), // JSON에서 직렬화한 MDX (컴파일 입력)
    compiledCode: text('compiled_code'), // bundleMDX 출력
    toc: jsonb('toc'),
    readingTime: jsonb('reading_time'),
    compiledAt: timestamp('compiled_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_post_translations_post_language').on(table.postId, table.language),
    check('ck_post_translations_language', sql`${table.language} IN ('ko','en')`),
  ]
)

export type PostRow = typeof posts.$inferSelect
export type PostTranslationRow = typeof postTranslations.$inferSelect
