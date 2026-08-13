import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
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
  (table) => [
    index('idx_posts_status_date').on(table.status, table.date),
    // arrayContains(tags, [...]) 조회용 (태그 rename 등) — 배열 포함 검색은 GIN이어야 인덱스를 탄다
    index('idx_posts_tags_gin').using('gin', table.tags),
  ]
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
  (table) => [
    index('idx_projects_order').on(table.published, table.displayOrder),
    index('idx_projects_tags_gin').using('gin', table.tags),
  ]
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

// 댓글 — giscus(GitHub Discussions)를 대체한다. posts.id에 FK로 붙으므로 URL이나 로케일이
// 바뀌어도 끊기지 않고, ko/en이 한 스레드를 공유한다.
export const commentAuthorTypeEnum = pgEnum('comment_author_type', ['user', 'anonymous'])
// 'pending'은 아직 쓰지 않는다 — 익명을 승인제로 돌릴 때 마이그레이션 없이 전환하려고 미리 넣어둔다.
export const commentStatusEnum = pgEnum('comment_status', [
  'visible',
  'pending',
  'hidden',
  'deleted',
])

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    // 자기참조는 타입이 순환하므로 반환 타입을 명시해야 한다. 답글은 1단까지만(깊이는 API에서 강제)
    parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),

    authorType: commentAuthorTypeEnum('author_type').notNull().default('user'),
    provider: text('provider'), // 'github' | 'google' | null(익명)
    // GitHub login은 사용자가 바꿀 수 있지만 numeric id는 불변 — 동일인 판정은 이 값으로 한다
    providerUserId: text('provider_user_id'),
    authorName: text('author_name').notNull(),
    authorAvatarUrl: text('author_avatar_url'),
    authorUrl: text('author_url'),

    bodyMd: text('body_md').notNull(),
    bodyHtml: text('body_html').notNull(), // sanitize 결과 캐시 — 읽기 경로에서 재파싱하지 않는다
    locale: text('locale'), // 작성 언어 — 표시는 통합, 배지용

    status: commentStatusEnum('status').notNull().default('visible'),
    isOwner: boolean('is_owner').notNull().default(false), // 서버 세션으로만 판정 (위조 불가)

    // 익명 작성자의 아바타 시드. anon_id 쿠키에서 HMAC으로 파생한 값만 저장하므로
    // 유출돼도 쿠키를 되돌리거나 다른 사람 아바타를 흉내낼 수 없다 (lib/comments/anon-identity.ts).
    anonAvatarSeed: text('anon_avatar_seed'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // 본문이 실제로 고쳐진 시각. updatedAt은 숨김/복구에도 갱신되므로 "수정됨" 표시에 쓸 수 없다
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_comments_post_created').on(table.postId, table.createdAt),
    // FK 참조 컬럼은 자동 인덱스가 없다 — 부모 삭제 cascade와 답글 조회가 seq scan이 되지 않게
    index('idx_comments_parent').on(table.parentId),
  ]
)

export type PostRow = typeof posts.$inferSelect
export type TagRow = typeof tags.$inferSelect
export type PostTranslationRow = typeof postTranslations.$inferSelect
export type ProjectRow = typeof projects.$inferSelect
export type ProjectTranslationRow = typeof projectTranslations.$inferSelect
export type AuthorRow = typeof authors.$inferSelect
export type AuthorTranslationRow = typeof authorTranslations.$inferSelect
export type CommentRow = typeof comments.$inferSelect
