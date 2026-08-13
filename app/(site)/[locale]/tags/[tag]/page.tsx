import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { getCoresByTag, getTagCounts } from '@/lib/db/posts'
import { getTagTitle } from '@/lib/db/tags'
import { isLocale, LOCALES, type Locale } from '@/lib/i18n/config'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { pageSlice, totalPagesOf } from '@/lib/pagination'

/** 이 태그로 글이 있는 로케일 — hreflang은 실제 존재하는 대응만 선언한다 */
async function localesWithTag(tag: string): Promise<Locale[]> {
  const results = await Promise.all(
    LOCALES.map(async (l) => ((await getCoresByTag(tag, l)).length > 0 ? l : null))
  )
  return results.filter((l): l is Locale => l !== null)
}

// ISR 필수 조건 — generateStaticParams가 있어야 요청 시 렌더 결과가 캐시된다
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const { locale } = params
  if (!isLocale(locale)) return []
  return Object.keys(await getTagCounts(locale)).map((tag) => ({ tag }))
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string; tag: string }>
}): Promise<Metadata> {
  const params = await props.params
  const locale = assertLocale(params.locale)
  const tag = decodeURI(params.tag)
  const t = getTranslations(locale)

  // 이 로케일에 글이 없는 태그는 soft-404를 내지 않는다 (미지의 태그 문자열 포함)
  const available = await localesWithTag(tag)
  if (!available.includes(locale)) notFound()

  const title = await getTagTitle(tag, locale)
  return genPageMetadata({
    locale,
    seg: `tags/${tag}`,
    title,
    description: t('seo.tagDescription', { tag: title }),
    availableLocales: available,
    rssSeg: `tags/${tag}/feed.xml`,
  })
}

export default async function TagPage(props: { params: Promise<{ locale: string; tag: string }> }) {
  const params = await props.params
  const locale = assertLocale(params.locale)
  const tag = decodeURI(params.tag)
  const [title, filteredPosts, tagCounts] = await Promise.all([
    getTagTitle(tag, locale),
    getCoresByTag(tag, locale),
    getTagCounts(locale),
  ])

  // 이 로케일에 글이 없으면 200 빈 페이지(soft-404) 대신 진짜 404
  if (filteredPosts.length === 0) notFound()

  return (
    <ListLayout
      posts={filteredPosts}
      initialDisplayPosts={pageSlice(filteredPosts, 1)}
      pagination={{ currentPage: 1, totalPages: totalPagesOf(filteredPosts.length) }}
      tagCounts={tagCounts}
      title={title}
      basePath={`/tags/${tag}`}
      activeTag={tag}
    />
  )
}
