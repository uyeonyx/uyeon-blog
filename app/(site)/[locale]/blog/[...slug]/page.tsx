import 'css/prism.css'

import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import MDXServerRenderer from '@/components/mdx/MDXServerRenderer'
import siteMetadata from '@/data/siteMetadata'
import { getAuthorCore } from '@/lib/db/authors'
import {
  getPost,
  getPostLocales,
  getPostStatusBySlug,
  getPublishedCore,
  getPublishedCores,
} from '@/lib/db/posts'
import { isLocale } from '@/lib/i18n/config'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { blogPostingJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld'
import { localeUrl, postImageUrl } from '@/lib/seo/urls'
import { safeDecodeURI } from '@/lib/utils'
import BlogPostClient from './BlogPostClient'
import PostNotice from './PostNotice'

// ISR 필수 조건 — 동적 세그먼트는 generateStaticParams가 있어야 요청 시 렌더 결과가 캐시된다.
// 새 글은 dynamicParams(기본 true)로 온디맨드 렌더 후 캐시된다.
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const { locale } = params
  if (!isLocale(locale)) return []
  const cores = await getPublishedCores(locale)
  return cores.map((p) => ({ slug: p.slug.split('/') }))
}

async function resolve(params: Promise<{ locale: string; slug: string[] }>) {
  const { locale, slug } = await params
  return { locale: assertLocale(locale), slug: safeDecodeURI(slug.join('/')) }
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slug: string[] }>
}): Promise<Metadata | undefined> {
  const { locale, slug } = await resolve(props.params)
  // 메타데이터에는 본문이 필요 없다 — 코어만 조회해 slug별 본문 캐시를 건드리지 않는다
  const post = await getPublishedCore(slug, locale)

  if (!post) {
    const t = getTranslations(locale)
    // 다른 언어로는 존재하는 글 — 안내 페이지를 200으로 주되 색인은 막는다
    if ((await getPostLocales(slug)).length > 0) {
      return { title: t('seo.untranslatedTitle'), robots: { index: false, follow: true } }
    }
    if ((await getPostStatusBySlug(slug)) === 'private') {
      return { title: t('seo.privateTitle'), robots: { index: false, follow: false } }
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

  const { body, ...content } = post
  const [cores, author] = await Promise.all([getPublishedCores(locale), getAuthorCore(locale)])

  // 같은 언어 목록에서의 앞/뒤 글 (cores는 최신순)
  const index = cores.findIndex((p) => p.slug === slug)
  const next = index > 0 ? cores[index - 1] : undefined
  const prev = index !== -1 && index < cores.length - 1 ? cores[index + 1] : undefined

  const canonical = localeUrl(locale, `blog/${slug}`)
  const t = getTranslations(locale)

  return (
    <>
      {/* 수식이 있는 글에만 katex CSS를 싣는다 — React 19가 precedence 링크를 head로 호이스팅·블로킹 처리 (FOUC 없음).
          정적 import는 청크 그래프에 붙어 조건부가 불가능해 prepare-assets가 public/에 자가 호스팅한다. */}
      {post.hasMath && (
        <link rel="stylesheet" href="/static/katex/katex.min.css" precedence="high" />
      )}
      <JsonLd data={blogPostingJsonLd({ post, locale, author, canonical })} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t('common.home'), url: localeUrl(locale) },
          { name: t('common.blog'), url: localeUrl(locale, 'blog') },
          { name: post.title, url: canonical },
        ])}
      />
      <BlogPostClient
        content={content}
        authorDetails={author ? [author] : []}
        prev={prev}
        next={next}
      >
        <MDXServerRenderer code={body.code} toc={post.toc} />
      </BlogPostClient>
    </>
  )
}
