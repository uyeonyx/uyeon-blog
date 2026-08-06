// MCP 글(posts) 도구 — admin API와 동일한 서비스 로직(post-service)을 직접 재사용한다.
import { put } from '@vercel/blob'
import { desc, eq } from 'drizzle-orm'
import { imageSize } from 'image-size'
import { z } from 'zod'
import {
  type CompileResult,
  LANGUAGES,
  SLUG_PATTERN,
  saveTranslation,
  touchPost,
  validatePublishable,
} from '@/lib/admin/post-service'
import { registerTags } from '@/lib/admin/tag-service'
import { getDb } from '@/lib/db/client'
import { posts, postTranslations } from '@/lib/db/schema'
import { mcpRevalidateTag } from '@/lib/mcp/request-context'
import { markdownToTiptap } from '@/lib/mdx/markdown-to-tiptap'
import { err, MARKDOWN_GUIDE, type McpServer, ok, UUID_PATTERN } from './shared'

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

async function resolvePost(idOrSlug: string) {
  const db = getDb()
  const [post] = UUID_PATTERN.test(idOrSlug)
    ? await db.select().from(posts).where(eq(posts.id, idOrSlug))
    : await db.select().from(posts).where(eq(posts.slug, idOrSlug))
  return post ?? null
}

const translationInputSchema = z
  .object({
    title: z.string().optional().describe('제목 (생략 시 기존 값 유지)'),
    summary: z
      .string()
      .nullable()
      .optional()
      .describe('요약 (생략 시 기존 값 유지, null이면 제거)'),
    markdown: z.string().optional().describe('본문 마크다운 (생략 시 기존 본문 유지)'),
  })
  .describe('언어별 부분 업데이트 — 제공한 필드만 변경된다')

export function registerPostTools(server: McpServer) {
  server.registerTool(
    'posts_list',
    {
      title: '글 목록',
      description:
        '블로그 글 목록을 조회한다 (모든 상태 포함, 최근 수정순). status로 필터링할 수 있다.',
      inputSchema: {
        status: z.enum(['draft', 'published', 'private', 'archived']).optional(),
      },
    },
    async ({ status }) => {
      const db = getDb()
      const [rows, translations] = await Promise.all([
        db
          .select()
          .from(posts)
          .where(status ? eq(posts.status, status) : undefined)
          .orderBy(desc(posts.updatedAt)),
        db.select().from(postTranslations),
      ])
      const items = rows.map((post) => {
        const trs = translations.filter((t) => t.postId === post.id)
        const ko = trs.find((t) => t.language === 'ko')
        const en = trs.find((t) => t.language === 'en')
        return {
          id: post.id,
          slug: post.slug,
          status: post.status,
          tags: post.tags,
          date: post.date,
          updatedAt: post.updatedAt,
          title: { ko: ko?.title ?? '', en: en?.title ?? '' },
          compileOk: {
            ko: !!ko?.compiledCode || !ko?.contentMd.trim(),
            en: !!en?.compiledCode || !en?.contentMd.trim(),
          },
        }
      })
      return ok({ items })
    }
  )

  server.registerTool(
    'post_get',
    {
      title: '글 조회',
      description: '글 하나를 id 또는 slug로 조회한다. 본문은 마크다운으로 반환된다.',
      inputSchema: { idOrSlug: z.string() },
    },
    async ({ idOrSlug }) => {
      const post = await resolvePost(idOrSlug)
      if (!post) return err(`글을 찾을 수 없습니다: ${idOrSlug}`)
      const db = getDb()
      const translations = await db
        .select()
        .from(postTranslations)
        .where(eq(postTranslations.postId, post.id))
      return ok({
        id: post.id,
        slug: post.slug,
        status: post.status,
        tags: post.tags,
        layout: post.layout,
        date: post.date,
        lastmod: post.lastmod,
        coverImage: (post.images as string[] | null)?.[0] ?? null,
        translations: Object.fromEntries(
          translations.map((t) => [
            t.language,
            {
              title: t.title,
              summary: t.summary,
              markdown: t.contentMd,
              compileOk: !!t.compiledCode || !t.contentMd.trim(),
            },
          ])
        ),
      })
    }
  )

  server.registerTool(
    'post_create',
    {
      title: '글 생성',
      description:
        '새 글을 draft 상태로 생성한다. ko/en 빈 번역 행이 함께 만들어진다. 내용은 post_update로 채운다. ' +
        'tags를 지정하기 전에 tags_list로 기존 태그를 확인해 재사용할 것.',
      inputSchema: {
        slug: z.string().describe('URL 경로 (소문자/숫자/하이픈)'),
        tags: z.array(z.string()).optional().describe('태그 — 기존 태그 slug 재사용 권장'),
      },
    },
    async ({ slug, tags }) => {
      const trimmed = slug.trim()
      if (!SLUG_PATTERN.test(trimmed)) {
        return err('slug는 소문자/숫자/하이픈만 사용할 수 있습니다')
      }
      const db = getDb()
      const existing = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, trimmed))
      if (existing.length > 0) return err(`이미 존재하는 slug입니다: ${trimmed}`)

      const tagsResult = tags !== undefined ? await registerTags(tags) : null
      const [post] = await db
        .insert(posts)
        .values({ slug: trimmed, ...(tagsResult ? { tags: tagsResult.slugs } : {}) })
        .returning()
      await db
        .insert(postTranslations)
        .values(LANGUAGES.map((language) => ({ postId: post.id, language })))
      await mcpRevalidateTag('posts')
      if (tagsResult && tagsResult.created.length > 0) await mcpRevalidateTag('tags')
      return ok({ id: post.id, slug: post.slug, status: 'draft', tags: post.tags })
    }
  )

  server.registerTool(
    'post_update',
    {
      title: '글 수정',
      description: [
        '글의 메타데이터와 본문을 수정한다. 제공한 필드만 변경된다 (부분 업데이트).',
        'slug 변경은 draft 상태에서만 가능하다. 발행 조건: ko/en 모두 제목과 컴파일 성공한 본문 필요.',
        MARKDOWN_GUIDE,
      ].join('\n'),
      inputSchema: {
        idOrSlug: z.string(),
        slug: z.string().optional().describe('새 slug (draft에서만)'),
        tags: z
          .array(z.string())
          .optional()
          .describe('태그 전체 치환 — tags_list로 기존 태그를 확인해 slug 재사용 권장'),
        layout: z.enum(['PostLayout', 'PostSimple', 'PostBanner']).nullable().optional(),
        date: z.string().optional().describe('게시일 (ISO 8601)'),
        coverImage: z
          .string()
          .url()
          .nullable()
          .optional()
          .describe('대표 이미지 URL (OG/썸네일, 권장 1200×630) — null이면 제거'),
        translations: z
          .object({ ko: translationInputSchema.optional(), en: translationInputSchema.optional() })
          .optional(),
      },
    },
    async ({ idOrSlug, slug, tags, layout, date, coverImage, translations }) => {
      const post = await resolvePost(idOrSlug)
      if (!post) return err(`글을 찾을 수 없습니다: ${idOrSlug}`)
      const db = getDb()
      // 태그는 canonical slug로 정규화해 저장, 미등록 태그는 마스터에 자동 등록
      const tagsResult = tags !== undefined ? await registerTags(tags) : null

      // slug 변경은 draft에서만 (게시된 URL 보호)
      if (slug !== undefined && slug !== post.slug) {
        if (post.status !== 'draft') return err('게시된 글의 slug는 변경할 수 없습니다')
        if (!SLUG_PATTERN.test(slug)) return err('slug는 소문자/숫자/하이픈만 사용할 수 있습니다')
        const dup = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug))
        if (dup.length > 0 && dup[0].id !== post.id) return err(`이미 존재하는 slug입니다: ${slug}`)
      }

      const parsedDate = date ? new Date(date) : undefined
      if (parsedDate && Number.isNaN(parsedDate.getTime())) {
        return err(`date를 해석할 수 없습니다: ${date}`)
      }

      await db
        .update(posts)
        .set({
          ...(slug !== undefined && post.status === 'draft' ? { slug } : {}),
          ...(tagsResult ? { tags: tagsResult.slugs } : {}),
          ...(layout !== undefined ? { layout } : {}),
          ...(parsedDate ? { date: parsedDate } : {}),
          ...(coverImage !== undefined ? { images: coverImage ? [coverImage] : null } : {}),
          lastmod: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(posts.id, post.id))

      const compileResults: CompileResult[] = []
      const warnings: string[] = []
      if (translations) {
        const existing = await db
          .select()
          .from(postTranslations)
          .where(eq(postTranslations.postId, post.id))
        for (const language of LANGUAGES) {
          const input = translations[language]
          if (!input) continue
          const current = existing.find((t) => t.language === language)
          if (!current) return err(`${language} 번역 행이 없습니다 — 데이터 정합성 오류`)

          // markdown 미제공 시 기존 contentJson 유지 (saveTranslation은 통째로 덮어쓰므로)
          let contentJson = current.contentJson
          if (input.markdown !== undefined) {
            const converted = markdownToTiptap(input.markdown)
            contentJson = converted.doc
            warnings.push(...converted.warnings.map((w) => `[${language}] ${w}`))
          }

          compileResults.push(
            await saveTranslation(post.id, language, {
              title: input.title ?? current.title,
              summary: input.summary === undefined ? current.summary : input.summary,
              contentJson,
            })
          )
        }
      }

      await touchPost(post.id)
      await mcpRevalidateTag('posts')
      if (tagsResult && tagsResult.created.length > 0) await mcpRevalidateTag('tags')
      return ok({
        ok: true,
        compileResults,
        ...(warnings.length > 0 ? { warnings } : {}),
      })
    }
  )

  server.registerTool(
    'post_set_status',
    {
      title: '글 상태 변경',
      description:
        '글 상태를 변경한다 (draft/published/private/archived). published/private 전환 시 양 언어 완성 검증을 통과해야 한다.',
      inputSchema: {
        idOrSlug: z.string(),
        status: z.enum(['draft', 'published', 'private', 'archived']),
      },
    },
    async ({ idOrSlug, status }) => {
      const post = await resolvePost(idOrSlug)
      if (!post) return err(`글을 찾을 수 없습니다: ${idOrSlug}`)

      // 비공개 전환도 완성된 글이어야 함 (draft→private 직행 포함)
      if (status === 'published' || status === 'private') {
        const problems = await validatePublishable(post.id)
        if (problems.length > 0) return err('게시할 수 없습니다', { problems })
      }

      const db = getDb()
      await db
        .update(posts)
        .set({
          status,
          // 최초 게시/비공개 전환 시 게시일 자동 설정
          date:
            (status === 'published' || status === 'private') && !post.date ? new Date() : post.date,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, post.id))

      await mcpRevalidateTag('posts')
      return ok({ ok: true, status, url: `https://uyeon.dev/blog/${post.slug}` })
    }
  )

  server.registerTool(
    'post_delete',
    {
      title: '글 삭제',
      description: '글과 모든 언어 번역을 완전히 삭제한다. 되돌릴 수 없다. confirm: true 필수.',
      inputSchema: {
        idOrSlug: z.string(),
        confirm: z.boolean().describe('삭제 확정 — true여야 실행된다'),
      },
    },
    async ({ idOrSlug, confirm }) => {
      if (confirm !== true) return err('confirm: true를 전달해야 삭제됩니다')
      const post = await resolvePost(idOrSlug)
      if (!post) return err(`글을 찾을 수 없습니다: ${idOrSlug}`)
      const db = getDb()
      await db.delete(posts).where(eq(posts.id, post.id))
      await mcpRevalidateTag('posts')
      return ok({ ok: true, deleted: post.slug })
    }
  )

  server.registerTool(
    'upload_image',
    {
      title: '이미지 업로드',
      description: [
        '이미지를 Vercel Blob에 업로드하고 본문에 넣을 마크다운 스니펫을 반환한다.',
        'url(서버가 직접 다운로드, 권장) 또는 base64(소형 이미지 전용 — 요청 바디 ~4.5MB 제한) 중 하나를 제공한다.',
        '지원 형식: png/jpg/gif/webp/avif/svg, 최대 10MB.',
        '반환된 url을 post_update의 coverImage로 전달하면 대표 이미지로 설정할 수 있다.',
      ].join('\n'),
      inputSchema: {
        scope: z
          .enum(['posts', 'projects', 'about'])
          .default('posts')
          .describe('저장 경로 최상위 (콘텐츠 종류)'),
        slug: z.string().describe('이미지가 속한 콘텐츠의 slug'),
        url: z.string().url().optional().describe('다운로드할 이미지 URL'),
        base64: z.string().optional().describe('base64 인코딩된 이미지 데이터'),
        contentType: z.string().optional().describe('base64 사용 시 MIME 타입 (예: image/png)'),
        alt: z.string().default('').describe('대체 텍스트'),
      },
    },
    async ({ scope, slug, url, base64, contentType, alt }) => {
      let buffer: Buffer
      let mime: string
      if (url) {
        let res: Response
        try {
          res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
        } catch (e) {
          return err(`이미지 다운로드 실패: ${e instanceof Error ? e.message : String(e)}`)
        }
        if (!res.ok) return err(`이미지 다운로드 실패: HTTP ${res.status}`)
        mime = (res.headers.get('content-type') ?? '').split(';')[0].trim()
        buffer = Buffer.from(await res.arrayBuffer())
      } else if (base64) {
        if (!contentType) return err('base64 사용 시 contentType이 필요합니다')
        mime = contentType
        try {
          buffer = Buffer.from(base64, 'base64')
        } catch {
          return err('base64 디코딩에 실패했습니다')
        }
      } else {
        return err('url 또는 base64 중 하나를 제공해야 합니다')
      }

      const ext = ALLOWED_IMAGE_TYPES[mime]
      if (!ext) return err(`지원하지 않는 이미지 형식입니다: ${mime || '(알 수 없음)'}`)
      if (buffer.length > MAX_IMAGE_SIZE) return err('이미지는 10MB 이하여야 합니다')

      let width: number | undefined
      let height: number | undefined
      try {
        const dim = imageSize(buffer)
        width = dim.width
        height = dim.height
      } catch {
        // SVG 등 치수 추출 실패는 허용
      }

      const blob = await put(`${scope}/${slug}/${crypto.randomUUID()}.${ext}`, buffer, {
        access: 'public',
        contentType: mime,
      })

      const markdown =
        width && height
          ? `<Image alt="${alt.replace(/"/g, '&quot;')}" src="${blob.url}" width={${width}} height={${height}} />`
          : `![${alt}](${blob.url})`
      return ok({ url: blob.url, width, height, markdown })
    }
  )
}
