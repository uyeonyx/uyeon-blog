import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import siteMetadata from '@/data/siteMetadata'
import { getAuthorCore } from '@/lib/db/authors'
import { getPost, getPostLocales, getPostStatusBySlug, getPublishedCores } from '@/lib/db/posts'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { blogPostingJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld'
import { localeUrl, postImageUrl } from '@/lib/seo/urls'
import BlogPostClient from './BlogPostClient'
import PostNotice from './PostNotice'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

async function resolve(params: Promise<{ locale: string; slug: string[] }>) {
  const { locale, slug } = await params
  return { locale: assertLocale(locale), slug: decodeURI(slug.join('/')) }
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slug: string[] }>
}): Promise<Metadata | undefined> {
  const { locale, slug } = await resolve(props.params)
  const post = await getPost(slug, locale)

  if (!post) {
    const t = getTranslations(locale)
    // 다른 언어로는 존재하는 글 — 안내 페이지를 200으로 주되 색인은 막는다
    if ((await getPostLocales(slug)).length > 0) {
      return { title: t('seo.untranslatedTitle'), robots: { index: false, follow: true } }
    }
    if ((await getPostStatusBySlug(slug)) === 'private') {
      return { title: '비공개 글', robots: { index: false, follow: false } }
    }
    return
  }

  const [available, author] = await Promise.all([getPostLocales(slug), getAuthorCore(locale)])

  return genPageMetadata({
    locale,
    seg: `blog/${slug}`,
    title: post.title,
    description: post.summary,
    image: postImageUrl(post, locale),
    // 한쪽 언어에만 있는 글은 그 언어의 hreflang만 내보낸다
    availableLocales: available,
    article: {
      publishedTime: new Date(post.date).toISOString(),
      modifiedTime: new Date(post.lastmod ?? post.updatedAt ?? post.date).toISOString(),
      authors: [author?.name ?? siteMetadata.author],
    },
  })
}

export default async function Page(props: { params: Promise<{ locale: string; slug: string[] }> }) {
  const { locale, slug } = await resolve(props.params)
  const post = await getPost(slug, locale)

  if (!post) {
    const available = await getPostLocales(slug)
    if (available.length > 0) {
      return <PostNotice variant="untranslated" otherLocale={available[0]} slug={slug} />
    }
    // 존재하지만 비공개인 글은 404 대신 안내 페이지
    if ((await getPostStatusBySlug(slug)) === 'private') {
      return <PostNotice variant="private" />
    }
    notFound()
  }

  const [cores, author] = await Promise.all([getPublishedCores(locale), getAuthorCore(locale)])

  // 같은 언어 목록에서의 앞/뒤 글 (cores는 최신순)
  const index = cores.findIndex((p) => p.slug === slug)
  const next = index > 0 ? cores[index - 1] : undefined
  const prev = index !== -1 && index < cores.length - 1 ? cores[index + 1] : undefined

  const canonical = localeUrl(locale, `blog/${slug}`)
  const t = getTranslations(locale)

  return (
    <>
      <JsonLd data={blogPostingJsonLd({ post, locale, author, canonical })} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t('common.home'), url: localeUrl(locale) },
          { name: t('common.blog'), url: localeUrl(locale, 'blog') },
          { name: post.title, url: canonical },
        ])}
      />
      <BlogPostClient post={post} authorDetails={author ? [author] : []} prev={prev} next={next} />
    </>
  )
}
