// llms.txt (llmstxt.org) — AI가 사이트를 파악할 수 있는 마크다운 인덱스.
// DB 조회 페이지 — 요청 시 렌더 (데이터는 'posts'/'projects' 태그로 캐시됨)
import siteMetadata from '@/data/siteMetadata'
import { getPublishedCores } from '@/lib/db/posts'
import { getAllPublishedProjectMarkdown } from '@/lib/db/projects'
import { dedupeBySlug } from '@/lib/rss'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [posts, projects] = await Promise.all([
    getPublishedCores().then(dedupeBySlug),
    getAllPublishedProjectMarkdown(),
  ])

  const lines = [
    `# ${siteMetadata.title}`,
    '',
    `> ${siteMetadata.description}`,
    '',
    'Content is bilingual (Korean/English). Post titles below are Korean-first.',
    `This blog also serves a public read-only MCP server at ${siteMetadata.siteUrl}/mcp`,
    `(Streamable HTTP, no auth) — connect it to your Claude. Guide: ${siteMetadata.siteUrl}/ai`,
    '',
    '## Posts',
    '',
    ...posts.map(
      (p) =>
        `- [${p.title}](${siteMetadata.siteUrl}/blog/${p.slug})${p.summary ? `: ${p.summary}` : ''}`
    ),
    '',
    '## Projects',
    '',
    ...projects.map((p) => {
      const tr = p.translations.ko ?? p.translations.en
      return `- [${tr?.title ?? p.slug}](${siteMetadata.siteUrl}/projects)${tr?.description ? `: ${tr.description}` : ''}`
    }),
    '',
    '## Optional',
    '',
    `- [About](${siteMetadata.siteUrl}/about): author profile, tech stack, experience`,
    `- [Full content](${siteMetadata.siteUrl}/llms-full.txt): all post bodies in markdown`,
    `- [RSS](${siteMetadata.siteUrl}/feed.xml)`,
  ]

  return new Response(`${lines.join('\n')}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
