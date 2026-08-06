import { getCoresByTag } from '@/lib/db/posts'
import { getTagTitle } from '@/lib/db/tags'
import { isLocale } from '@/lib/i18n/config'
import { getTranslations } from '@/lib/i18n/translate'
import { generateRss } from '@/lib/rss'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; tag: string }> }
) {
  const { locale, tag } = await params
  if (!isLocale(locale)) return new Response('Not found', { status: 404 })

  const decoded = decodeURI(tag)
  const posts = await getCoresByTag(decoded, locale)
  if (posts.length === 0) {
    return new Response('No posts', { status: 404 })
  }
  const t = getTranslations(locale)
  const title = await getTagTitle(decoded, locale)
  return new Response(
    generateRss(posts, {
      locale,
      seg: `tags/${decoded}/feed.xml`,
      title: `${title} | ${t('common.blog')}`,
      description: t('seo.tagDescription', { tag: title }),
    }),
    {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    }
  )
}
