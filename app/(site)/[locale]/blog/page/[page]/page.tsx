import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { getPublishedCores, getTagCounts } from '@/lib/db/posts'
import { localePath } from '@/lib/i18n/paths'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { pageSlice, totalPagesOf } from '@/lib/pagination'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  params: Promise<{ locale: string; page: string }>
}): Promise<Metadata> {
  const params = await props.params
  const locale = assertLocale(params.locale)
  const t = getTranslations(locale)
  const pageNumber = Number.parseInt(params.page, 10)

  return genPageMetadata({
    locale,
    seg: `blog/page/${pageNumber}`,
    title: `${t('common.blog')} — ${t('seo.pageSuffix', { n: pageNumber })}`,
    description: t('seo.blogDescription'),
    // 언어별 글 수가 달라 2페이지끼리는 번역 관계가 아니다 — 없는 대응을 선언하지 않는다
    noHreflang: true,
  })
}

export default async function Page(props: { params: Promise<{ locale: string; page: string }> }) {
  const params = await props.params
  const locale = assertLocale(params.locale)
  const t = getTranslations(locale)
  const pageNumber = Number.parseInt(params.page, 10)
  if (Number.isNaN(pageNumber) || pageNumber <= 0) notFound()
  // /blog/page/1 은 /blog 의 완전 중복
  if (pageNumber === 1) permanentRedirect(`${localePath(locale)}/blog`)

  const [posts, tagCounts] = await Promise.all([getPublishedCores(locale), getTagCounts(locale)])
  const totalPages = totalPagesOf(posts.length)
  if (pageNumber > totalPages) notFound()

  return (
    <ListLayout
      posts={posts}
      initialDisplayPosts={pageSlice(posts, pageNumber)}
      pagination={{ currentPage: pageNumber, totalPages }}
      tagCounts={tagCounts}
      title={t('blog.allPosts')}
      basePath="/blog"
    />
  )
}
