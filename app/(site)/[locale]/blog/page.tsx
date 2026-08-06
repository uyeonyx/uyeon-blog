import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { getPublishedCores, getTagCounts } from '@/lib/db/posts'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { pageSlice, totalPagesOf } from '@/lib/pagination'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = assertLocale((await props.params).locale)
  const t = getTranslations(locale)
  return genPageMetadata({
    locale,
    seg: 'blog',
    title: t('common.blog'),
    description: t('seo.blogDescription'),
    rssSeg: 'feed.xml',
  })
}

export default async function BlogPage(props: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await props.params).locale)
  const t = getTranslations(locale)
  const [posts, tagCounts] = await Promise.all([getPublishedCores(locale), getTagCounts(locale)])

  return (
    <ListLayout
      posts={posts}
      initialDisplayPosts={pageSlice(posts, 1)}
      pagination={{ currentPage: 1, totalPages: totalPagesOf(posts.length) }}
      tagCounts={tagCounts}
      title={t('blog.allPosts')}
      basePath="/blog"
    />
  )
}
