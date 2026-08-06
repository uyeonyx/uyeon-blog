// RSS XML 생성 — scripts/rss.mjs에서 이식 (escape 버그 수정: 전역 escape() → escapeHtml)
import { escape as escapeHtml } from 'pliny/utils/htmlEscaper.js'
import siteMetadata from '@/data/siteMetadata'
import { HTML_LANG, type Locale } from '@/lib/i18n/config'
import { localeUrl } from '@/lib/seo/urls'
import type { PostCore } from '@/lib/types/post'

type SiteConfig = typeof siteMetadata

const generateRssItem = (config: SiteConfig, post: PostCore, locale: Locale) => {
  const url = localeUrl(locale, `blog/${post.slug}`)
  return `
  <item>
    <guid>${url}</guid>
    <title>${escapeHtml(post.title)}</title>
    <link>${url}</link>
    ${post.summary ? `<description>${escapeHtml(post.summary)}</description>` : ''}
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <author>${config.email} (${config.author})</author>
    ${post.tags?.map((t) => `<category>${escapeHtml(t)}</category>`).join('') ?? ''}
  </item>
`
}

interface RssOptions {
  locale: Locale
  /** 로케일 접두사를 뺀 피드 경로. 'feed.xml' | 'tags/react/feed.xml' */
  seg?: string
  title?: string
  description?: string
}

export function generateRss(
  posts: PostCore[],
  { locale, seg = 'feed.xml', title, description }: RssOptions
): string {
  const config = siteMetadata
  return `
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${escapeHtml(title ?? config.title)}</title>
      <link>${localeUrl(locale, 'blog')}</link>
      <description>${escapeHtml(description ?? config.description)}</description>
      <language>${HTML_LANG[locale]}</language>
      <managingEditor>${config.email} (${config.author})</managingEditor>
      <webMaster>${config.email} (${config.author})</webMaster>
      <lastBuildDate>${(posts[0] ? new Date(posts[0].date) : new Date()).toUTCString()}</lastBuildDate>
      <atom:link href="${localeUrl(locale, seg)}" rel="self" type="application/rss+xml"/>
      ${posts.map((post) => generateRssItem(config, post, locale)).join('')}
    </channel>
  </rss>
`
}
