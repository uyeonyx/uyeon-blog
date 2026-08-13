import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { getCoresByTag, getTagCounts } from '@/lib/db/posts'
import { getTagTitle } from '@/lib/db/tags'
import { localePath } from '@/lib/i18n/paths'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { pageSlice, totalPagesOf } from '@/lib/pagination'

// 빌드 타임 열거는 생략(페이지네이션은 드물게 조회) — 빈 배열이라도 있어야 온디맨드 ISR이 된다
export function generateStaticParams() {
  return []
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string; tag: string; page: string }>
}): Promise<Metadata> {
  const params = await props.params
  const locale = assertLocale(params.locale)
  const tag = decodeURI(params.tag)
  const t = getTranslations(locale)
  const title = await getTagTitle(tag, locale)
  const pageNumber = Number.parseInt(params.page, 10)

  return genPageMetadata({
    locale,
    seg: `tags/${tag}/page/${pageNumber}`,
    title: `${title} — ${t('seo.pageSuffix', { n: pageNumber })}`,
    description: t('seo.tagDescription', { tag: title }),
    noHreflang: true,
  })
}

export default async function TagPage(props: {
  params: Promise<{ locale: string; tag: string; page: string }>
}) {
  const params = await props.params
  const locale = assertLocale(params.locale)
  const tag = decodeURI(params.tag)
  const pageNumber = Number.parseInt(params.page, 10)
  if (Number.isNaN(pageNumber) || pageNumber <= 0) notFound()
  if (pageNumber === 1) permanentRedirect(`${localePath(locale)}/tags/${encodeURIComponent(tag)}`)

  const [title, filteredPosts, tagCounts] = await Promise.all([
    getTagTitle(tag, locale),
    getCoresByTag(tag, locale),
    getTagCounts(locale),
  ])
  const totalPages = totalPagesOf(filteredPosts.length)
  if (pageNumber > totalPages) notFound()

  return (
    <ListLayout
      posts={filteredPosts}
      initialDisplayPosts={pageSlice(filteredPosts, pageNumber)}
      pagination={{ currentPage: pageNumber, totalPages }}
      tagCounts={tagCounts}
      title={title}
      basePath={`/tags/${tag}`}
      activeTag={tag}
    />
  )
}
