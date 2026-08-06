// kbar 검색 인덱스 — 기존 정적 public/search.json과 동일한 URL/shape을 런타임으로 제공
import { getPublishedCores } from '@/lib/db/posts'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export async function GET() {
  const cores = await getPublishedCores()
  return Response.json(cores, {
    headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
  })
}
