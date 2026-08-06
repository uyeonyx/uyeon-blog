// llms.txt (llmstxt.org) — AI가 사이트를 파악할 수 있는 마크다운 인덱스.
// 언어별로 쪼개지 않는다: 에이전트가 사이트 전체를 한 번에 파악하는 단일 인덱스여야 한다.
// DB 조회 페이지 — 요청 시 렌더 (데이터는 'posts'/'projects' 태그로 캐시됨)
import siteMetadata from '@/data/siteMetadata'
import { getAllPublishedMarkdown } from '@/lib/db/posts'
import { getAllPublishedProjectMarkdown } from '@/lib/db/projects'
import { localeUrl } from '@/lib/seo/urls'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [posts, projects] = await Promise.all([
    getAllPublishedMarkdown(),
    getAllPublishedProjectMarkdown(),
  ])

  const lines = [
    `# ${siteMetadata.title}`,
    '',
    `> ${siteMetadata.description}`,
    '',
    'Content is bilingual. Every URL is language-prefixed: /ko/... and /en/...',
    `This blog also serves a public read-only MCP server at ${siteMetadata.siteUrl}/mcp`,
    `(Streamable HTTP, no auth) — connect it to your Claude. Guide: ${localeUrl('en', 'ai')}`,
    '',
    '## Posts',
    '',
    ...posts.map((p) => {
      const primary = p.translations.ko ?? p.translations.en
      const links = (['ko', 'en'] as const)
        .filter((l) => p.translations[l])
        .map((l) => `[${p.translations[l]?.title}](${localeUrl(l, `blog/${p.slug}`)})`)
        .join(' / ')
      return `- ${links}${primary?.summary ? `: ${primary.summary}` : ''}`
    }),
    '',
    '## Projects',
    '',
    ...projects.map((p) => {
      const tr = p.translations.ko ?? p.translations.en
      return `- [${tr?.title ?? p.slug}](${localeUrl('ko', 'projects')})${tr?.description ? `: ${tr.description}` : ''}`
    }),
    '',
    '## Optional',
    '',
    `- [About](${localeUrl('ko', 'about')}): author profile, tech stack, experience`,
    `- [Full content](${siteMetadata.siteUrl}/llms-full.txt): all post bodies in markdown`,
    `- [RSS (ko)](${localeUrl('ko', 'feed.xml')}) / [RSS (en)](${localeUrl('en', 'feed.xml')})`,
  ]

  return new Response(`${lines.join('\n')}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
