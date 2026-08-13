import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { getPublishedCores, getTagCounts } from '@/lib/db/posts'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { pageSlice, totalPagesOf } from '@/lib/pagination'
import { breadcrumbJsonLd, collectionPageJsonLd } from '@/lib/seo/jsonld'
import { localeUrl } from '@/lib/seo/urls'

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
  const url = localeUrl(locale, 'blog')

  return (
    <>
      <JsonLd
        data={collectionPageJsonLd({
          locale,
          url,
          name: t('common.blog'),
          description: t('seo.blogDescription'),
          items: posts.map((p) => ({ name: p.title, url: localeUrl(locale, p.path) })),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t('common.home'), url: localeUrl(locale) },
          { name: t('common.blog'), url },
        ])}
      />
      <ListLayout
        posts={posts}
        initialDisplayPosts={pageSlice(posts, 1)}
        pagination={{ currentPage: 1, totalPages: totalPagesOf(posts.length) }}
        tagCounts={tagCounts}
        title={t('blog.allPosts')}
        basePath="/blog"
      />
    </>
  )
}
