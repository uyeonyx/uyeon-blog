// kbar 검색 인덱스 — 해당 언어의 글만 (기존 정적 public/search.json과 동일한 shape)
import { getPublishedCores } from '@/lib/db/posts'
import { isLocale } from '@/lib/i18n/config'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) return new Response('Not found', { status: 404 })

  const cores = await getPublishedCores(locale)
  return Response.json(cores, {
    headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
  })
}
