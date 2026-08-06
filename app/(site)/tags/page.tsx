import { genPageMetadata } from 'app/seo'
import { getTagCounts } from '@/lib/db/posts'
import TagsPageClient from './TagsPageClient'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export const metadata = genPageMetadata({ title: 'Tags', description: 'Things I blog about' })

export default async function Page() {
  const tagCounts = await getTagCounts()
  return <TagsPageClient tagCounts={tagCounts} />
}
