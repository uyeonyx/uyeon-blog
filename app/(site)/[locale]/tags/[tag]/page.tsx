import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { getCoresByTag, getTagCounts } from '@/lib/db/posts'
import { getTagTitle } from '@/lib/db/tags'
import { isLocale } from '@/lib/i18n/config'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { pageSlice, totalPagesOf } from '@/lib/pagination'

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
  const title = await getTagTitle(tag, locale)

  return genPageMetadata({
    locale,
    seg: `tags/${tag}`,
    title,
    description: t('seo.tagDescription', { tag: title }),
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
