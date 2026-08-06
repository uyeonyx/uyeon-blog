import { getPublishedCores } from '@/lib/db/posts'
import Main from './Main'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export default async function Page() {
  const posts = await getPublishedCores()
  return <Main posts={posts} />
}
