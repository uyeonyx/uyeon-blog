import { getPublishedCores } from '@/lib/db/posts'
import { isLocale } from '@/lib/i18n/config'
import { getTranslations } from '@/lib/i18n/translate'
import { generateRss } from '@/lib/rss'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) return new Response('Not found', { status: 404 })

  const posts = await getPublishedCores(locale)
  if (posts.length === 0) {
    return new Response('No posts', { status: 404 })
  }
  const t = getTranslations(locale)
  return new Response(
    generateRss(posts, { locale, seg: 'feed.xml', description: t('seo.siteDescription') }),
    {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    }
  )
}
