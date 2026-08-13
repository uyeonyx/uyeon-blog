import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { getTagCounts } from '@/lib/db/posts'
import { getTagLabelMap } from '@/lib/db/tags'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { breadcrumbJsonLd, collectionPageJsonLd } from '@/lib/seo/jsonld'
import { localeUrl } from '@/lib/seo/urls'
import TagsPageClient from '../TagsPageClient'

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
  const t = getTranslations(locale)
  const [tagCounts, labels] = await Promise.all([getTagCounts(locale), getTagLabelMap(locale)])
  const url = localeUrl(locale, 'tags')

  return (
    <>
      <JsonLd
        data={collectionPageJsonLd({
          locale,
          url,
          name: t('pages.tags.title'),
          description: t('pages.tags.description'),
          items: Object.keys(tagCounts).map((slug) => ({
            name: labels[slug] ?? slug,
            url: localeUrl(locale, `tags/${slug}`),
          })),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t('common.home'), url: localeUrl(locale) },
          { name: t('pages.tags.title'), url },
        ])}
      />
      <TagsPageClient tagCounts={tagCounts} />
    </>
  )
}
