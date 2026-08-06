import { genPageMetadata } from 'app/seo'
import { notFound } from 'next/navigation'
import { getPublishedCores, getTagCounts } from '@/lib/db/posts'
import BlogPageClient from '../../BlogPageClient'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

const POSTS_PER_PAGE = 5

export const metadata = genPageMetadata({ title: 'Blog' })

export default async function Page(props: { params: Promise<{ page: string }> }) {
  const params = await props.params
  const pageNumber = Number.parseInt(params.page, 10)
  if (Number.isNaN(pageNumber) || pageNumber <= 0) {
    return notFound()
  }
  const [posts, tagCounts] = await Promise.all([getPublishedCores(), getTagCounts()])

  return (
    <BlogPageClient
      allPosts={posts}
      tagCounts={tagCounts}
      postsPerPage={POSTS_PER_PAGE}
      pageNumber={pageNumber}
    />
  )
}
