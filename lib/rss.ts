// RSS XML 생성 — scripts/rss.mjs에서 이식 (escape 버그 수정: 전역 escape() → escapeHtml)
import { escape as escapeHtml } from 'pliny/utils/htmlEscaper.js'
import siteMetadata from '@/data/siteMetadata'
import type { PostCore } from '@/lib/types/post'

type SiteConfig = typeof siteMetadata

const generateRssItem = (config: SiteConfig, post: PostCore) => `
  <item>
    <guid>${config.siteUrl}/blog/${post.slug}</guid>
    <title>${escapeHtml(post.title)}</title>
    <link>${config.siteUrl}/blog/${post.slug}</link>
    ${post.summary ? `<description>${escapeHtml(post.summary)}</description>` : ''}
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <author>${config.email} (${config.author})</author>
    ${post.tags?.map((t) => `<category>${escapeHtml(t)}</category>`).join('') ?? ''}
  </item>
`

export function generateRss(posts: PostCore[], page = 'feed.xml'): string {
  const config = siteMetadata
  return `
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${escapeHtml(config.title)}</title>
      <link>${config.siteUrl}/blog</link>
      <description>${escapeHtml(config.description)}</description>
      <language>${config.language}</language>
      <managingEditor>${config.email} (${config.author})</managingEditor>
      <webMaster>${config.email} (${config.author})</webMaster>
      <lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>
      <atom:link href="${config.siteUrl}/${page}" rel="self" type="application/rss+xml"/>
      ${posts.map((post) => generateRssItem(config, post)).join('')}
    </channel>
  </rss>
`
}

/** slug 중복 제거 — RSS에는 언어당 1건이 아니라 글당 1건만 (한국어 우선) */
export function dedupeBySlug(posts: PostCore[]): PostCore[] {
  const seen = new Map<string, PostCore>()
  for (const post of posts) {
    const existing = seen.get(post.slug)
    if (!existing || (existing.language !== 'ko' && post.language === 'ko')) {
      seen.set(post.slug, post)
    }
  }
  return [...seen.values()]
}
