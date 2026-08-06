import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import { getTagCounts } from '@/lib/db/posts'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import TagsPageClient from './TagsPageClient'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = assertLocale((await props.params).locale)
  const t = getTranslations(locale)
  return genPageMetadata({
    locale,
    seg: 'tags',
    title: t('pages.tags.title'),
    description: t('pages.tags.description'),
  })
}

export default async function Page(props: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await props.params).locale)
  const tagCounts = await getTagCounts(locale)
  return <TagsPageClient tagCounts={tagCounts} />
}
