import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import siteMetadata from '@/data/siteMetadata'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { getCoresByTag, getTagCounts } from '@/lib/db/posts'
import { getTagLabels } from '@/lib/db/tags'

async function tagTitle(tag: string): Promise<string> {
  const labels = await getTagLabels()
  return labels[tag]?.en ?? tag[0].toUpperCase() + tag.split(' ').join('-').slice(1)
}

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

const POSTS_PER_PAGE = 5

export async function generateMetadata(props: {
  params: Promise<{ tag: string }>
}): Promise<Metadata> {
  const params = await props.params
  const tag = decodeURI(params.tag)
  return genPageMetadata({
    title: await tagTitle(tag),
    description: `${siteMetadata.title} ${tag} tagged content`,
    alternates: {
      canonical: './',
      types: {
        'application/rss+xml': `${siteMetadata.siteUrl}/tags/${tag}/feed.xml`,
      },
    },
  })
}

export default async function TagPage(props: { params: Promise<{ tag: string }> }) {
  const params = await props.params
  const tag = decodeURI(params.tag)
  const [title, filteredPosts, tagCounts] = await Promise.all([
    tagTitle(tag),
    getCoresByTag(tag),
    getTagCounts(),
  ])
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE)
  const initialDisplayPosts = filteredPosts.slice(0, POSTS_PER_PAGE)
  const pagination = {
    currentPage: 1,
    totalPages: totalPages,
  }

  return (
    <ListLayout
      posts={filteredPosts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={pagination}
      tagCounts={tagCounts}
      title={title}
    />
  )
}
