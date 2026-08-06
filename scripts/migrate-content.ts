// 기존 data/blog/*.mdx를 DB(posts/post_translations)로 마이그레이션한다.
// 실행: DATABASE_URL=... pnpm exec tsx scripts/migrate-content.ts [--force]
// idempotent: 이미 존재하는 slug는 건너뛴다 (--force 시 재컴파일/덮어쓰기)
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { and, eq } from 'drizzle-orm'
import matter from 'gray-matter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { getDb } from '../lib/db/client'
import { posts, postTranslations } from '../lib/db/schema'
import { extractLanguageFromFilename } from '../lib/i18n/utils'
import { compilePostMdx } from '../lib/mdx/compile'
import { smartQuotes } from '../lib/utils'
import { mdastToTiptap } from './mdast-to-tiptap'

const BLOG_DIR = path.join(process.cwd(), 'data', 'blog')
const force = process.argv.includes('--force')

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath)

interface ParsedFile {
  language: string
  title: string
  summary: string | null
  tags: string[]
  date: Date | null
  draft: boolean
  layout: string | null
  content: string
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL이 설정되지 않았습니다')
    process.exit(1)
  }
  const db = getDb()

  // slug 기준 그룹핑
  const groups = new Map<string, ParsedFile[]>()
  for (const file of readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'))) {
    const language = extractLanguageFromFilename(file) || 'en'
    const slug = file.replace(/\.(ko|en)\.mdx$/, '').replace(/\.mdx$/, '')
    const raw = readFileSync(path.join(BLOG_DIR, file), 'utf8')
    const { data, content } = matter(raw)
    const list = groups.get(slug) ?? []
    list.push({
      language,
      title: String(data.title ?? ''),
      summary: data.summary ? String(data.summary) : null,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      date: data.date ? new Date(data.date) : null,
      draft: data.draft === true,
      layout: data.layout ? String(data.layout) : null,
      content: content.trim(),
    })
    groups.set(slug, list)
  }

  for (const [slug, files] of groups) {
    const existing = await db.select().from(posts).where(eq(posts.slug, slug))
    if (existing.length > 0 && !force) {
      console.log(`skip (존재함): ${slug}`)
      continue
    }

    const ko = files.find((f) => f.language === 'ko')
    const en = files.find((f) => f.language === 'en')
    const primary = ko ?? en
    if (!primary) continue

    let postId: string
    if (existing.length > 0) {
      postId = existing[0].id
      await db
        .update(posts)
        .set({
          status: primary.draft ? 'draft' : 'published',
          tags: primary.tags,
          layout: primary.layout,
          date: primary.date,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId))
    } else {
      const [inserted] = await db
        .insert(posts)
        .values({
          slug,
          status: primary.draft ? 'draft' : 'published',
          tags: primary.tags,
          layout: primary.layout,
          date: primary.date,
        })
        .returning()
      postId = inserted.id
    }

    for (const language of ['ko', 'en'] as const) {
      const file = files.find((f) => f.language === language)
      const content = file?.content ?? ''
      const contentJson = content ? mdastToTiptap(parser.parse(content)) : null

      let compiled: Awaited<ReturnType<typeof compilePostMdx>> | null = null
      if (content) {
        try {
          compiled = await compilePostMdx(content)
        } catch (e) {
          console.error(`컴파일 실패 [${slug}/${language}]:`, e)
        }
      }

      const values = {
        postId,
        language,
        title: smartQuotes(file?.title ?? ''),
        summary: file?.summary ? smartQuotes(file.summary) : null,
        contentJson,
        contentMd: content,
        compiledCode: compiled?.code ?? null,
        toc: compiled?.toc ?? null,
        readingTime: compiled?.readingTime ?? null,
        compiledAt: compiled ? new Date() : null,
      }

      const existingTr = await db
        .select({ id: postTranslations.id })
        .from(postTranslations)
        .where(and(eq(postTranslations.postId, postId), eq(postTranslations.language, language)))
      if (existingTr.length > 0) {
        await db
          .update(postTranslations)
          .set(values)
          .where(eq(postTranslations.id, existingTr[0].id))
      } else {
        await db.insert(postTranslations).values(values)
      }
      console.log(`ok: ${slug}/${language}${compiled ? '' : ' (컴파일 실패 — 확인 필요)'}`)
    }
  }

  console.log('마이그레이션 완료')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
