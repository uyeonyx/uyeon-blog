import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

export const postStatusEnum = pgEnum('post_status', ['draft', 'published', 'private', 'archived'])

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

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    published: boolean('published').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    imgSrc: text('img_src'),
    href: text('href'),
    tags: text('tags').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_projects_order').on(table.published, table.displayOrder)]
)

export const projectTranslations = pgTable(
  'project_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    language: text('language').notNull(),
    title: text('title').notNull().default(''),
    description: text('description').notNull().default(''),
    period: text('period'),
    role: text('role'),
    company: text('company'),
    contentJson: jsonb('content_json'), // Tiptap 문서 — 편집 source of truth
    contentMd: text('content_md').notNull().default(''),
    compiledCode: text('compiled_code'),
    compiledAt: timestamp('compiled_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_project_translations_project_language').on(table.projectId, table.language),
    check('ck_project_translations_language', sql`${table.language} IN ('ko','en')`),
  ]
)

// 태그 마스터 — posts.tags/projects.tags 배열의 canonical slug와 언어별 표시 라벨.
// 배열 컬럼에는 FK를 걸 수 없으므로 정합성은 저장 경로(lib/admin/tag-service.ts)에서 보장한다.
export const tags = pgTable('tags', {
  slug: text('slug').primaryKey(), // github-slugger 출력 (조회 계층 slugify와 동일 규칙)
  labelKo: text('label_ko').notNull(),
  labelEn: text('label_en').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const authors = pgTable('authors', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(), // 현재 'default' 단일 행, 확장 대비
  avatarUrl: text('avatar_url'),
  email: text('email'),
  github: text('github'),
  linkedin: text('linkedin'),
  twitter: text('twitter'),
  bluesky: text('bluesky'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const authorTranslations = pgTable(
  'author_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => authors.id, { onDelete: 'cascade' }),
    language: text('language').notNull(),
    name: text('name').notNull().default(''),
    occupation: text('occupation'),
    company: text('company'),
    techStack: jsonb('tech_stack'), // TechCategory[] — components/TechStack.tsx shape
    timeline: jsonb('timeline'), // TimelineItem[] — components/Timeline.tsx shape
    contentJson: jsonb('content_json'), // 소개글(IntroCard 내부) Tiptap 문서
    contentMd: text('content_md').notNull().default(''),
    compiledCode: text('compiled_code'),
    compiledAt: timestamp('compiled_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_author_translations_author_language').on(table.authorId, table.language),
    check('ck_author_translations_language', sql`${table.language} IN ('ko','en')`),
  ]
)

export type PostRow = typeof posts.$inferSelect
export type TagRow = typeof tags.$inferSelect
export type PostTranslationRow = typeof postTranslations.$inferSelect
export type ProjectRow = typeof projects.$inferSelect
export type ProjectTranslationRow = typeof projectTranslations.$inferSelect
export type AuthorRow = typeof authors.$inferSelect
export type AuthorTranslationRow = typeof authorTranslations.$inferSelect
