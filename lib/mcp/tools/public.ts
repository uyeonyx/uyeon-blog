// 공개 read-only MCP 도구 — published 콘텐츠만 노출한다.
// draft/private/archived 필터는 lib/db/*의 로더가 SQL 레벨에서 강제하므로 여기서 상태를 다루지 않는다.
import { slug as slugify } from 'github-slugger'
import { z } from 'zod'
import { getAuthorMarkdown } from '@/lib/db/authors'
import { getAllCores, getAllPublishedMarkdown, getPublishedPostMarkdown } from '@/lib/db/posts'
import { getAllPublishedProjectMarkdown, getPublishedProjectMarkdown } from '@/lib/db/projects'
import type { Locale } from '@/lib/i18n/config'
import { localeUrl } from '@/lib/seo/urls'
import { err, type McpServer, ok } from './shared'

// 공개 URL은 전부 로케일 접두사를 갖는다. 대표 링크는 x-default와 같은 ko.
const postUrl = (slug: string, locale: Locale = 'ko') => localeUrl(locale, `blog/${slug}`)
const projectUrl = () => localeUrl('ko', 'projects')

interface PostListItem {
  slug: string
  url: string
  tags: string[]
  date: string
  lastmod?: string
  title: Partial<Record<'ko' | 'en', string>>
  summary: Partial<Record<'ko' | 'en', string>>
  readingMinutes: Partial<Record<'ko' | 'en', number>>
}

/** 언어별 행으로 펼쳐진 cores를 slug당 1건으로 그룹핑 (최신순 유지) */
async function listPublishedPosts(): Promise<PostListItem[]> {
  const cores = await getAllCores()
  const bySlug = new Map<string, PostListItem>()
  for (const core of cores) {
    let item = bySlug.get(core.slug)
    if (!item) {
      item = {
        slug: core.slug,
        url: postUrl(core.slug),
        tags: core.tags,
        date: core.date,
        lastmod: core.lastmod,
        title: {},
        summary: {},
        readingMinutes: {},
      }
      bySlug.set(core.slug, item)
    }
    const lang = core.language as 'ko' | 'en'
    item.title[lang] = core.title
    if (core.summary) item.summary[lang] = core.summary
    if (core.readingTime?.minutes) {
      item.readingMinutes[lang] = Math.ceil(core.readingTime.minutes)
    }
  }
  return [...bySlug.values()]
}

/** 검색 스니펫 — 첫 매칭 위치 주변 발췌 */
function makeSnippet(text: string, token: string, radius = 80): string {
  const idx = text.toLowerCase().indexOf(token)
  if (idx < 0) return text.slice(0, radius * 2)
  const start = Math.max(0, idx - radius)
  const end = Math.min(text.length, idx + token.length + radius)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`
}

export function registerPublicTools(server: McpServer) {
  server.registerTool(
    'posts_list',
    {
      title: '글 목록',
      description:
        '게시된 블로그 글 목록을 조회한다 (최신순). 글마다 ko/en 제목·요약과 공개 URL이 포함된다. tag로 필터링할 수 있다.',
      inputSchema: {
        tag: z.string().optional().describe('태그 필터 (대소문자 무관)'),
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
      },
    },
    async ({ tag, limit, offset }) => {
      let items = await listPublishedPosts()
      if (tag) {
        const target = slugify(tag)
        items = items.filter((p) => p.tags.some((t) => slugify(t) === target))
      }
      const total = items.length
      return ok({ total, offset, items: items.slice(offset, offset + limit) })
    }
  )

  server.registerTool(
    'post_get',
    {
      title: '글 조회',
      description: '게시된 글 하나를 slug로 조회한다. ko/en 본문이 마크다운으로 반환된다.',
      inputSchema: { slug: z.string() },
    },
    async ({ slug }) => {
      const post = await getPublishedPostMarkdown(slug.trim())
      if (!post) return err(`글을 찾을 수 없습니다: ${slug}`)
      return ok({ ...post, url: postUrl(post.slug) })
    }
  )

  server.registerTool(
    'posts_search',
    {
      title: '글 검색',
      description:
        '게시된 글을 키워드로 검색한다 (제목 > 태그 > 요약 > 본문 순 가중치). 매칭 스니펫과 공개 URL을 반환한다.',
      inputSchema: {
        query: z.string().min(1).describe('검색어 (공백으로 구분된 복수 키워드 가능)'),
        limit: z.number().int().min(1).max(50).default(10),
      },
    },
    async ({ query, limit }) => {
      const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
      if (tokens.length === 0) return err('검색어가 비어 있습니다')

      const posts = await getAllPublishedMarkdown()
      const results: { score: number; item: Record<string, unknown> }[] = []
      for (const post of posts) {
        let score = 0
        let snippet = ''
        const tagText = post.tags.join(' ').toLowerCase()
        for (const token of tokens) {
          for (const lang of ['ko', 'en'] as const) {
            const tr = post.translations[lang]
            if (!tr) continue
            if (tr.title.toLowerCase().includes(token)) score += 10
            if (tr.summary?.toLowerCase().includes(token)) score += 3
            if (tr.markdown.toLowerCase().includes(token)) {
              score += 1
              if (!snippet) snippet = makeSnippet(tr.markdown, token)
            }
          }
          if (tagText.includes(token)) score += 5
        }
        if (score === 0) continue
        results.push({
          score,
          item: {
            slug: post.slug,
            url: postUrl(post.slug),
            tags: post.tags,
            date: post.date,
            title: Object.fromEntries(
              Object.entries(post.translations).map(([lang, tr]) => [lang, tr.title])
            ),
            snippet: snippet || undefined,
            score,
          },
        })
      }
      results.sort((a, b) => b.score - a.score)
      return ok({ total: results.length, items: results.slice(0, limit).map((r) => r.item) })
    }
  )

  server.registerTool(
    'projects_list',
    {
      title: '프로젝트 목록',
      description: '공개된 프로젝트 목록을 조회한다. ko/en 제목·설명과 기간·역할이 포함된다.',
      inputSchema: {},
    },
    async () => {
      const projects = await getAllPublishedProjectMarkdown()
      return ok({
        url: projectUrl(),
        items: projects.map(({ imgSrc: _imgSrc, translations, ...meta }) => ({
          ...meta,
          translations: Object.fromEntries(
            Object.entries(translations).map(([lang, tr]) => {
              const { markdown: _markdown, ...rest } = tr
              return [lang, rest]
            })
          ),
        })),
      })
    }
  )

  server.registerTool(
    'project_get',
    {
      title: '프로젝트 조회',
      description:
        '공개된 프로젝트 하나를 slug로 조회한다. ko/en 상세 설명이 마크다운으로 반환된다.',
      inputSchema: { slug: z.string() },
    },
    async ({ slug }) => {
      const project = await getPublishedProjectMarkdown(slug.trim())
      if (!project) return err(`프로젝트를 찾을 수 없습니다: ${slug}`)
      return ok({ ...project, url: projectUrl() })
    }
  )

  server.registerTool(
    'about_get',
    {
      title: '소개 조회',
      description:
        '블로그 저자 소개를 조회한다. 프로필·소셜 링크·기술 스택·경력 타임라인과 ko/en 소개글 마크다운이 반환된다.',
      inputSchema: {},
    },
    async () => {
      const author = await getAuthorMarkdown('default')
      if (!author) return err('소개 정보가 없습니다')
      return ok({ ...author, url: localeUrl('ko', 'about') })
    }
  )
}
