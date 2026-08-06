import { getCoresByTag } from '@/lib/db/posts'
import { dedupeBySlug, generateRss } from '@/lib/rss'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const decoded = decodeURI(tag)
  const posts = dedupeBySlug(await getCoresByTag(decoded))
  if (posts.length === 0) {
    return new Response('No posts', { status: 404 })
  }
  return new Response(generateRss(posts, `tags/${decoded}/feed.xml`), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
