// MCP 글(posts) 도구 — admin API와 동일한 서비스 로직(post-service)을 직접 재사용한다.
//
// 성능 계약 두 가지를 지킨다:
//  1) 본문이 바뀌지 않은 요청에서는 MDX 컴파일(esbuild, 언어당 수 초)을 돌리지 않는다.
//  2) 목록/조회에서 compiled_code(번들 전체)를 절대 select하지 않는다.
import { put } from '@vercel/blob'
import { and, eq, sql } from 'drizzle-orm'
import { imageSize } from 'image-size'
import { z } from 'zod'
import {
  type CompileResult,
  createPost,
  LANGUAGES,
  listPostSummaries,
  SLUG_PATTERN,
  saveTranslation,
  touchPost,
  validatePublishable,
} from '@/lib/admin/post-service'
import { registerTags } from '@/lib/admin/tag-service'
import { getDb } from '@/lib/db/client'
import { posts, postTranslations } from '@/lib/db/schema'
import { mcpRevalidateTags, type RevalidateTag, revalidateWarning } from '@/lib/mcp/request-context'
import { markdownToTiptap } from '@/lib/mdx/markdown-to-tiptap'
import { err, MARKDOWN_GUIDE, type McpServer, ok, sameContent, UUID_PATTERN } from './shared'

// SVG는 받지 않는다 — 스크립트를 품을 수 있는 유일한 이미지 형식 (admin upload 라우트와 동일 정책)
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
}
// imageSize()가 스니핑한 실제 형식 ↔ 선언된 MIME 대조용
const SNIFFED_TYPE_BY_MIME: Record<string, string[]> = {
  'image/png': ['png'],
  'image/jpeg': ['jpg'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'image/avif': ['avif', 'mif1', 'msf1'],
}
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
// Vercel 서버리스 요청 바디 한계(~4.5MB)에서 역산한 base64 원본 크기 — 디코드 전에 막는다
const MAX_BASE64_SOURCE = 3 * 1024 * 1024

/** 컴파일 성공 여부를 SQL에서 계산 — compiled_code 본문을 끌어오지 않기 위함 */
const compiledOkExpr = sql<boolean>`(${postTranslations.compiledCode} IS NOT NULL OR btrim(${postTranslations.contentMd}) = '')`

async function resolvePost(idOrSlug: string) {
  const db = getDb()
  const columns = {
    id: posts.id,
    slug: posts.slug,
    status: posts.status,
    tags: posts.tags,
    layout: posts.layout,
    images: posts.images,
    date: posts.date,
    lastmod: posts.lastmod,
  }
  const [post] = UUID_PATTERN.test(idOrSlug)
    ? await db.select(columns).from(posts).where(eq(posts.id, idOrSlug))
    : await db.select(columns).from(posts).where(eq(posts.slug, idOrSlug))
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
      description: [
        '블로그 글 목록을 조회한다 (모든 상태 포함, 최근 수정순). 본문은 포함되지 않는다.',
        'q로 slug·제목을 부분 검색할 수 있으므로, 글을 찾을 때 전체 목록을 훑고 post_get을 반복할 필요가 없다.',
      ].join('\n'),
      inputSchema: {
        status: z.enum(['draft', 'published', 'private', 'archived']).optional(),
        q: z.string().optional().describe('slug 또는 제목 부분 일치 (대소문자 무시)'),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      },
    },
    async ({ status, q, limit, offset }) => {
      const { items, total } = await listPostSummaries({ status, q, limit, offset })
      return ok({ items, total, offset, hasMore: offset + items.length < total })
    }
  )

  server.registerTool(
    'post_get',
    {
      title: '글 조회',
      description: [
        '글 하나를 id 또는 slug로 조회한다. 본문은 마크다운으로 반환된다.',
        '한 언어만 필요하면 language를 지정할 것 — 기본은 ko/en 본문을 모두 반환하므로 응답이 두 배가 된다.',
        '메타데이터만 필요하면 body: false.',
      ].join('\n'),
      inputSchema: {
        idOrSlug: z.string(),
        language: z.enum(['ko', 'en']).optional().describe('생략 시 양 언어 모두'),
        body: z.boolean().default(true).describe('false면 본문을 빼고 메타데이터만'),
      },
    },
    async ({ idOrSlug, language, body }) => {
      const post = await resolvePost(idOrSlug)
      if (!post) return err(`글을 찾을 수 없습니다: ${idOrSlug}`)
      const db = getDb()
      const rows = await db
        .select({
          language: postTranslations.language,
          title: postTranslations.title,
          summary: postTranslations.summary,
          markdown: postTranslations.contentMd,
          compileOk: compiledOkExpr,
        })
        .from(postTranslations)
        .where(
          language
            ? and(eq(postTranslations.postId, post.id), eq(postTranslations.language, language))
            : eq(postTranslations.postId, post.id)
        )
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
          rows.map((t) => [
            t.language,
            {
              title: t.title,
              summary: t.summary,
              ...(body ? { markdown: t.markdown } : {}),
              compileOk: t.compileOk,
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
      description: [
        '새 글을 draft 상태로 생성한다. ko/en 번역 행이 함께 만들어진다.',
        'translations를 함께 주면 생성과 동시에 내용이 채워진다 — post_update를 따로 부를 필요가 없다.',
        'tags를 지정하기 전에 tags_list로 기존 태그를 확인해 재사용할 것.',
        MARKDOWN_GUIDE,
      ].join('\n'),
      inputSchema: {
        slug: z.string().describe('URL 경로 (소문자/숫자/하이픈)'),
        tags: z.array(z.string()).optional().describe('태그 — 기존 태그 slug 재사용 권장'),
        layout: z.enum(['PostLayout', 'PostSimple', 'PostBanner']).nullable().optional(),
        date: z.string().optional().describe('게시일 (ISO 8601)'),
        coverImage: z
          .string()
          .url()
          .nullable()
          .optional()
          .describe('대표 이미지 URL (OG/썸네일, 권장 1200×630)'),
        translations: z
          .object({ ko: translationInputSchema.optional(), en: translationInputSchema.optional() })
          .optional()
          .describe('생성과 동시에 채울 언어별 내용'),
      },
    },
    async ({ slug, tags, layout, date, coverImage, translations }) => {
      const parsedDate = date ? new Date(date) : undefined
      if (parsedDate && Number.isNaN(parsedDate.getTime())) {
        return err(`date를 해석할 수 없습니다: ${date}`)
      }

      const result = await createPost(slug, tags)
      if (!result.ok) {
        return result.error === 'invalid_slug'
          ? err('slug는 소문자/숫자/하이픈만 사용할 수 있습니다')
          : err(`이미 존재하는 slug입니다: ${slug.trim()}`)
      }

      const db = getDb()
      if (layout !== undefined || parsedDate || coverImage !== undefined) {
        await db
          .update(posts)
          .set({
            ...(layout !== undefined ? { layout } : {}),
            ...(parsedDate ? { date: parsedDate } : {}),
            ...(coverImage !== undefined ? { images: coverImage ? [coverImage] : null } : {}),
          })
          .where(eq(posts.id, result.id))
      }

      const warnings: string[] = []
      const compileResults: CompileResult[] = []
      if (translations) {
        // 새 행이라 기존 본문이 없다 — markdown이 없는 언어는 컴파일할 것도 없다
        const jobs = LANGUAGES.flatMap((language) => {
          const input = translations[language]
          if (!input) return []
          if (input.markdown === undefined) {
            return [
              saveTranslation(
                result.id,
                language,
                { title: input.title ?? '', summary: input.summary ?? null, contentJson: null },
                { keepContent: { compiledOk: true } }
              ),
            ]
          }
          const converted = markdownToTiptap(input.markdown)
          warnings.push(...converted.warnings.map((w) => `[${language}] ${w}`))
          return [
            saveTranslation(result.id, language, {
              title: input.title ?? '',
              summary: input.summary ?? null,
              contentJson: converted.doc,
            }),
          ]
        })
        compileResults.push(...(await Promise.all(jobs)))
      }

      const tagsToRevalidate: RevalidateTag[] = ['posts']
      if (result.createdTags.length > 0) tagsToRevalidate.push('tags')
      const warning = revalidateWarning(await mcpRevalidateTags(tagsToRevalidate))
      if (warning) warnings.push(warning)
      return ok({
        id: result.id,
        slug: result.slug,
        status: 'draft',
        tags: result.tags,
        ...(compileResults.length > 0 ? { compileResults } : {}),
        ...(warnings.length > 0 ? { warnings } : {}),
      })
    }
  )

  server.registerTool(
    'post_update',
    {
      title: '글 수정',
      description: [
        '글의 메타데이터와 본문을 수정한다. 제공한 필드만 변경된다 (부분 업데이트).',
        '본문 일부만 고칠 때는 post_edit_body가 더 빠르고 싸다 — 전문을 다시 올리지 않아도 된다.',
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
        // compiled_code는 select하지 않는다 (언어당 수백 KB) — 컴파일 여부만 SQL로 받는다
        const existing = await db
          .select({
            language: postTranslations.language,
            title: postTranslations.title,
            summary: postTranslations.summary,
            contentJson: postTranslations.contentJson,
            compileOk: compiledOkExpr,
          })
          .from(postTranslations)
          .where(eq(postTranslations.postId, post.id))

        // 먼저 전부 검증하고 준비한 뒤에 실행한다 — 중간 실패로 한 언어만 반영되는 일을 막고,
        // 언어별 MDX 컴파일을 병렬로 돌리기 위함
        const jobs: Array<Promise<CompileResult>> = []
        for (const language of LANGUAGES) {
          const input = translations[language]
          if (!input) continue
          const current = existing.find((t) => t.language === language)
          if (!current) return err(`${language} 번역 행이 없습니다 — 데이터 정합성 오류`)

          const meta = {
            title: input.title ?? current.title,
            summary: input.summary === undefined ? current.summary : input.summary,
          }

          // 본문이 실질적으로 그대로면 컴파일을 건너뛴다. markdown 미제공은 물론,
          // 에이전트가 전문을 그대로 다시 올린 경우(가장 흔한 패턴)도 여기서 걸린다.
          let nextDoc = current.contentJson
          let bodyChanged = false
          if (input.markdown !== undefined) {
            const converted = markdownToTiptap(input.markdown)
            if (!sameContent(converted.doc, current.contentJson)) {
              nextDoc = converted.doc
              bodyChanged = true
              warnings.push(...converted.warnings.map((w) => `[${language}] ${w}`))
            }
          }

          jobs.push(
            saveTranslation(
              post.id,
              language,
              { ...meta, contentJson: nextDoc },
              bodyChanged ? undefined : { keepContent: { compiledOk: current.compileOk } }
            )
          )
        }
        compileResults.push(...(await Promise.all(jobs)))
      }

      // touchPost를 따로 부르지 않는다 — 위 UPDATE가 이미 updatedAt/lastmod를 쓴다
      const tagsToRevalidate: RevalidateTag[] = ['posts']
      if (tagsResult && tagsResult.created.length > 0) tagsToRevalidate.push('tags')
      const revalidateWarn = revalidateWarning(await mcpRevalidateTags(tagsToRevalidate))
      if (revalidateWarn) warnings.push(revalidateWarn)
      return ok({
        ok: true,
        compileResults,
        ...(warnings.length > 0 ? { warnings } : {}),
      })
    }
  )

  server.registerTool(
    'post_edit_body',
    {
      title: '글 본문 부분 수정',
      description: [
        '본문의 일부 문자열만 찾아 바꾼다. 전문을 다시 올리는 post_update보다 훨씬 싸고 빠르며,',
        '지정한 언어만 다시 컴파일되므로 반대 언어는 건드리지 않는다.',
        'find는 post_get이 돌려준 본문에 있는 그대로여야 하고, 본문 안에서 유일해야 한다',
        '(유일하지 않으면 앞뒤 줄을 함께 포함해 늘릴 것). edits는 순서대로 적용된다.',
        '하나라도 실패하면 아무것도 저장하지 않는다.',
        MARKDOWN_GUIDE,
      ].join('\n'),
      inputSchema: {
        idOrSlug: z.string(),
        language: z.enum(['ko', 'en']),
        edits: z
          .array(
            z.object({
              find: z.string().min(1).describe('본문에서 찾을 문자열 — 유일해야 한다'),
              replace: z.string().describe('대체할 문자열 (빈 문자열이면 삭제)'),
            })
          )
          .min(1)
          .describe('순서대로 적용되는 치환 목록'),
      },
    },
    async ({ idOrSlug, language, edits }) => {
      const post = await resolvePost(idOrSlug)
      if (!post) return err(`글을 찾을 수 없습니다: ${idOrSlug}`)
      const db = getDb()
      const [current] = await db
        .select({
          title: postTranslations.title,
          summary: postTranslations.summary,
          markdown: postTranslations.contentMd,
        })
        .from(postTranslations)
        .where(and(eq(postTranslations.postId, post.id), eq(postTranslations.language, language)))
      if (!current) return err(`${language} 번역 행이 없습니다 — 데이터 정합성 오류`)

      // 메모리에서 전부 적용한 뒤에만 저장한다 — 중간 실패 시 부분 반영이 남지 않게
      let next = current.markdown
      for (const [i, edit] of edits.entries()) {
        const matches = countOccurrences(next, edit.find)
        if (matches === 0) {
          return err(`edits[${i}]의 find를 본문에서 찾을 수 없습니다`, {
            hint: 'post_get으로 현재 본문을 다시 읽어 저장된 그대로의 문자열을 쓰세요 (본문은 정규화되어 보관됩니다)',
          })
        }
        if (matches > 1) {
          return err(`edits[${i}]의 find가 ${matches}곳에 일치합니다`, {
            hint: '앞뒤 줄을 함께 포함해 유일한 문자열로 만드세요',
          })
        }
        // 함수형 치환 — replace 안의 $&, $1 같은 패턴이 해석되지 않게
        next = next.replace(edit.find, () => edit.replace)
      }

      if (next === current.markdown) {
        return ok({ ok: true, language, changed: false, note: '결과가 기존 본문과 같습니다' })
      }

      const converted = markdownToTiptap(next)
      const compileResult = await saveTranslation(post.id, language, {
        title: current.title,
        summary: current.summary,
        contentJson: converted.doc,
      })
      await touchPost(post.id)

      const warnings = converted.warnings.map((w) => `[${language}] ${w}`)
      const warning = revalidateWarning(await mcpRevalidateTags(['posts']))
      if (warning) warnings.push(warning)
      return ok({
        ok: true,
        language,
        changed: true,
        applied: edits.length,
        compileResult,
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

      const warning = revalidateWarning(await mcpRevalidateTags(['posts']))
      return ok({
        ok: true,
        status,
        url: `https://uyeon.dev/blog/${post.slug}`,
        ...(warning ? { warning } : {}),
      })
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
      const warning = revalidateWarning(await mcpRevalidateTags(['posts']))
      return ok({ ok: true, deleted: post.slug, ...(warning ? { warning } : {}) })
    }
  )

  server.registerTool(
    'upload_image',
    {
      title: '이미지 업로드',
      description: [
        '이미지를 Vercel Blob에 업로드하고 본문에 넣을 마크다운 스니펫을 반환한다.',
        'url(서버가 직접 다운로드)을 강하게 권장한다 — base64는 요청 전체가 모델 컨텍스트를 통과하므로 소형 이미지에만 쓸 것.',
        '지원 형식: png/jpg/gif/webp/avif. 최대 10MB(url) / 3MB(base64).',
        '반환된 url을 post_update의 coverImage로 전달하면 대표 이미지로 설정할 수 있다.',
      ].join('\n'),
      inputSchema: {
        scope: z
          .enum(['posts', 'projects', 'about'])
          .default('posts')
          .describe('저장 경로 최상위 (콘텐츠 종류)'),
        slug: z.string().describe('이미지가 속한 콘텐츠의 slug'),
        url: z.string().url().optional().describe('다운로드할 이미지 URL (권장)'),
        base64: z.string().optional().describe('base64 인코딩된 이미지 데이터 (소형만, 최대 3MB)'),
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
        if (buffer.length > MAX_BASE64_SOURCE) {
          return err('base64로는 3MB까지만 올릴 수 있습니다 — url을 쓰세요')
        }
      } else {
        return err('url 또는 base64 중 하나를 제공해야 합니다')
      }

      const ext = ALLOWED_IMAGE_TYPES[mime]
      if (!ext) return err(`지원하지 않는 이미지 형식입니다: ${mime || '(알 수 없음)'}`)
      if (buffer.length > MAX_IMAGE_SIZE) return err('이미지는 10MB 이하여야 합니다')

      // 매직바이트 스니핑 — 선언된 MIME을 신뢰하지 않는다
      let width: number | undefined
      let height: number | undefined
      try {
        const dim = imageSize(buffer)
        width = dim.width
        height = dim.height
        if (!dim.type || !SNIFFED_TYPE_BY_MIME[mime]?.includes(dim.type)) {
          return err(`파일 내용이 선언된 형식(${mime})과 다릅니다`)
        }
      } catch {
        return err('이미지 파일로 해석할 수 없습니다')
      }

      const blob = await put(`${scope}/${slug}/${crypto.randomUUID()}.${ext}`, buffer, {
        access: 'public',
        contentType: mime,
      })

      // ?w=&h= 힌트 — 순수 마크다운으로 삽입돼도 렌더러가 치수를 복원한다 (admin upload와 동일 규약)
      const uploadedUrl = width && height ? `${blob.url}?w=${width}&h=${height}` : blob.url
      const markdown =
        width && height
          ? `<Image alt="${alt.replace(/"/g, '&quot;')}" src="${uploadedUrl}" width={${width}} height={${height}} />`
          : `![${alt}](${uploadedUrl})`
      return ok({ url: uploadedUrl, width, height, markdown })
    }
  )
}

/** 겹치지 않는 부분 문자열 출현 횟수 */
function countOccurrences(haystack: string, needle: string): number {
  let n = 0
  let i = haystack.indexOf(needle)
  while (i !== -1) {
    n++
    i = haystack.indexOf(needle, i + needle.length)
  }
  return n
}
