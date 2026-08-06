// MCP projects/about 도구 — project-service/author-service를 직접 재사용한다.
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  getAuthorForEdit,
  saveAuthorTranslation,
  updateAuthorMeta,
  validateTechStack,
  validateTimeline,
} from '@/lib/admin/author-service'
import { type CompileResult, LANGUAGES } from '@/lib/admin/post-service'
import {
  createProject,
  deleteProject,
  getProjectForEdit,
  listProjects,
  saveProjectTranslation,
  touchProject,
  updateProjectMeta,
} from '@/lib/admin/project-service'
import { getDb } from '@/lib/db/client'
import { projects } from '@/lib/db/schema'
import { mcpRevalidateTag } from '@/lib/mcp/request-context'
import { markdownToTiptap } from '@/lib/mdx/markdown-to-tiptap'
import type { TechCategory, TimelineItem } from '@/lib/types/author'
import { err, MARKDOWN_GUIDE, type McpServer, ok, UUID_PATTERN } from './shared'

async function resolveProjectId(idOrSlug: string): Promise<string | null> {
  if (UUID_PATTERN.test(idOrSlug)) return idOrSlug
  const db = getDb()
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, idOrSlug))
  return row?.id ?? null
}

const projectTranslationInputSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional().describe('카드에 표시될 한 줄 설명'),
    period: z.string().nullable().optional().describe('예: 2024.01 - 2024.12'),
    role: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    markdown: z.string().optional().describe('상세 본문 마크다운 (생략 시 기존 본문 유지)'),
  })
  .describe('언어별 부분 업데이트 — 제공한 필드만 변경된다')

const techStackSchema = z
  .array(
    z.object({
      title: z.string(),
      techs: z.array(z.object({ name: z.string(), items: z.array(z.string()) })),
    })
  )
  .describe('기술 스택 카테고리 목록')

const timelineSchema = z
  .array(
    z.object({
      period: z.string(),
      title: z.string(),
      company: z.string(),
      description: z.string(),
      link: z.string().optional(),
    })
  )
  .describe('경력 타임라인 (최신순)')

const authorTranslationInputSchema = z
  .object({
    name: z.string().optional(),
    occupation: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    techStack: techStackSchema.optional(),
    timeline: timelineSchema.optional(),
    markdown: z.string().optional().describe('소개글(Philosophy 카드) 마크다운'),
  })
  .describe('언어별 부분 업데이트 — 제공한 필드만 변경된다')

export function registerContentTools(server: McpServer) {
  // ---------- projects ----------

  server.registerTool(
    'projects_list',
    {
      title: '프로젝트 목록',
      description: '프로젝트 목록을 조회한다 (비공개 포함, 표시 순서순).',
      inputSchema: {},
    },
    async () => ok({ items: await listProjects() })
  )

  server.registerTool(
    'project_get',
    {
      title: '프로젝트 조회',
      description: '프로젝트 하나를 id 또는 slug로 조회한다. 본문은 마크다운으로 반환된다.',
      inputSchema: { idOrSlug: z.string() },
    },
    async ({ idOrSlug }) => {
      const id = await resolveProjectId(idOrSlug)
      const found = id ? await getProjectForEdit(id) : null
      if (!found) return err(`프로젝트를 찾을 수 없습니다: ${idOrSlug}`)
      const { project, translations } = found
      return ok({
        id: project.id,
        slug: project.slug,
        published: project.published,
        displayOrder: project.displayOrder,
        imgSrc: project.imgSrc,
        href: project.href,
        tags: project.tags,
        translations: Object.fromEntries(
          translations.map((t) => [
            t.language,
            {
              title: t.title,
              description: t.description,
              period: t.period,
              role: t.role,
              company: t.company,
              markdown: t.contentMd,
              compileOk: !!t.compiledCode || !t.contentMd.trim(),
            },
          ])
        ),
      })
    }
  )

  server.registerTool(
    'project_create',
    {
      title: '프로젝트 생성',
      description:
        '새 프로젝트를 생성한다 (기본 공개 상태, ko/en 빈 번역 행 포함). 내용은 project_update로 채운다.',
      inputSchema: { slug: z.string().describe('식별자 (소문자/숫자/하이픈)') },
    },
    async ({ slug }) => {
      const result = await createProject(slug)
      if (!result.ok) {
        return result.error === 'invalid_slug'
          ? err('slug는 소문자/숫자/하이픈만 사용할 수 있습니다')
          : err(`이미 존재하는 slug입니다: ${slug}`)
      }
      await mcpRevalidateTag('projects')
      return ok({ id: result.id, slug: result.slug })
    }
  )

  server.registerTool(
    'project_update',
    {
      title: '프로젝트 수정',
      description: [
        '프로젝트의 메타데이터와 언어별 내용을 수정한다. 제공한 필드만 변경된다 (부분 업데이트).',
        MARKDOWN_GUIDE,
      ].join('\n'),
      inputSchema: {
        idOrSlug: z.string(),
        slug: z.string().optional(),
        published: z.boolean().optional(),
        displayOrder: z.number().int().optional(),
        imgSrc: z.string().nullable().optional(),
        href: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        translations: z
          .object({
            ko: projectTranslationInputSchema.optional(),
            en: projectTranslationInputSchema.optional(),
          })
          .optional(),
      },
    },
    async ({ idOrSlug, translations, ...meta }) => {
      const id = await resolveProjectId(idOrSlug)
      if (!id) return err(`프로젝트를 찾을 수 없습니다: ${idOrSlug}`)

      const metaResult = await updateProjectMeta(id, {
        slug: meta.slug,
        published: meta.published,
        displayOrder: meta.displayOrder,
        imgSrc: meta.imgSrc,
        href: meta.href,
        tags: meta.tags,
      })
      if (!metaResult.ok) {
        if (metaResult.error === 'not_found') return err('프로젝트를 찾을 수 없습니다')
        if (metaResult.error === 'invalid_slug')
          return err('slug는 소문자/숫자/하이픈만 사용할 수 있습니다')
        return err('이미 존재하는 slug입니다')
      }

      const compileResults: CompileResult[] = []
      const warnings: string[] = []
      if (translations) {
        const found = await getProjectForEdit(id)
        if (!found) return err('프로젝트를 찾을 수 없습니다')
        for (const language of LANGUAGES) {
          const input = translations[language]
          if (!input) continue
          const current = found.translations.find((t) => t.language === language)
          if (!current) return err(`${language} 번역 행이 없습니다 — 데이터 정합성 오류`)

          let contentJson = current.contentJson
          if (input.markdown !== undefined) {
            const converted = markdownToTiptap(input.markdown)
            contentJson = converted.doc
            warnings.push(...converted.warnings.map((w) => `[${language}] ${w}`))
          }

          compileResults.push(
            await saveProjectTranslation(id, language, {
              title: input.title ?? current.title,
              description: input.description ?? current.description,
              period: input.period === undefined ? current.period : input.period,
              role: input.role === undefined ? current.role : input.role,
              company: input.company === undefined ? current.company : input.company,
              contentJson,
            })
          )
        }
      }

      await touchProject(id)
      await mcpRevalidateTag('projects')
      return ok({ ok: true, compileResults, ...(warnings.length > 0 ? { warnings } : {}) })
    }
  )

  server.registerTool(
    'project_delete',
    {
      title: '프로젝트 삭제',
      description:
        '프로젝트와 모든 언어 번역을 완전히 삭제한다. 되돌릴 수 없다. confirm: true 필수.',
      inputSchema: {
        idOrSlug: z.string(),
        confirm: z.boolean().describe('삭제 확정 — true여야 실행된다'),
      },
    },
    async ({ idOrSlug, confirm }) => {
      if (confirm !== true) return err('confirm: true를 전달해야 삭제됩니다')
      const id = await resolveProjectId(idOrSlug)
      if (!id) return err(`프로젝트를 찾을 수 없습니다: ${idOrSlug}`)
      const deleted = await deleteProject(id)
      if (!deleted) return err('프로젝트를 찾을 수 없습니다')
      await mcpRevalidateTag('projects')
      return ok({ ok: true })
    }
  )

  // ---------- about ----------

  server.registerTool(
    'about_get',
    {
      title: '소개 페이지 조회',
      description:
        '소개(about) 페이지 데이터를 조회한다: 프로필/소셜(공통) + 언어별 이름/직함/소개글(마크다운)/기술스택(JSON)/타임라인(JSON).',
      inputSchema: {},
    },
    async () => {
      const { author, translations } = await getAuthorForEdit('default')
      return ok({
        avatarUrl: author.avatarUrl,
        email: author.email,
        github: author.github,
        linkedin: author.linkedin,
        twitter: author.twitter,
        bluesky: author.bluesky,
        translations: Object.fromEntries(
          translations.map((t) => [
            t.language,
            {
              name: t.name,
              occupation: t.occupation,
              company: t.company,
              techStack: t.techStack,
              timeline: t.timeline,
              markdown: t.contentMd,
              compileOk: !!t.compiledCode || !t.contentMd.trim(),
            },
          ])
        ),
      })
    }
  )

  server.registerTool(
    'about_update',
    {
      title: '소개 페이지 수정',
      description: [
        '소개(about) 페이지를 수정한다. 제공한 필드만 변경된다 (부분 업데이트).',
        'techStack: [{title, techs: [{name, items: string[]}]}], timeline: [{period, title, company, description, link?}]',
        '소개글(markdown)은 Philosophy 카드 안에 렌더되는 순수 마크다운이다.',
        MARKDOWN_GUIDE,
      ].join('\n'),
      inputSchema: {
        avatarUrl: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        github: z.string().nullable().optional(),
        linkedin: z.string().nullable().optional(),
        twitter: z.string().nullable().optional(),
        bluesky: z.string().nullable().optional(),
        translations: z
          .object({
            ko: authorTranslationInputSchema.optional(),
            en: authorTranslationInputSchema.optional(),
          })
          .optional(),
      },
    },
    async ({ translations, ...meta }) => {
      const { author, translations: existing } = await getAuthorForEdit('default')

      // jsonb shape 사전 검증
      if (translations) {
        for (const language of LANGUAGES) {
          const input = translations[language]
          if (!input) continue
          if (input.techStack != null) {
            const e = validateTechStack(input.techStack)
            if (e) return err(`[${language}] ${e}`)
          }
          if (input.timeline != null) {
            const e = validateTimeline(input.timeline)
            if (e) return err(`[${language}] ${e}`)
          }
        }
      }

      await updateAuthorMeta(author.id, meta)

      const compileResults: CompileResult[] = []
      const warnings: string[] = []
      if (translations) {
        for (const language of LANGUAGES) {
          const input = translations[language]
          if (!input) continue
          const current = existing.find((t) => t.language === language)
          if (!current) return err(`${language} 번역 행이 없습니다 — 데이터 정합성 오류`)

          let contentJson = current.contentJson
          if (input.markdown !== undefined) {
            const converted = markdownToTiptap(input.markdown)
            contentJson = converted.doc
            warnings.push(...converted.warnings.map((w) => `[${language}] ${w}`))
          }

          compileResults.push(
            await saveAuthorTranslation(author.id, language, {
              name: input.name ?? current.name,
              occupation: input.occupation === undefined ? current.occupation : input.occupation,
              company: input.company === undefined ? current.company : input.company,
              techStack: (input.techStack as TechCategory[] | undefined) ?? undefined,
              timeline: (input.timeline as TimelineItem[] | undefined) ?? undefined,
              contentJson,
            })
          )
        }
      }

      await mcpRevalidateTag('authors')
      return ok({ ok: true, compileResults, ...(warnings.length > 0 ? { warnings } : {}) })
    }
  )
}
