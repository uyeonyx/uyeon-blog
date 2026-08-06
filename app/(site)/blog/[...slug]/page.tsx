import type { Authors } from 'contentlayer/generated'
import { allAuthors } from 'contentlayer/generated'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { coreContent } from 'pliny/utils/contentlayer'
import siteMetadata from '@/data/siteMetadata'
import { getPostPair, getPostStatusBySlug, getPublishedCores } from '@/lib/db/posts'
import BlogPostClient from './BlogPostClient'
import PrivatePostNotice from './PrivatePostNotice'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>
}): Promise<Metadata | undefined> {
  const params = await props.params
  const slug = decodeURI(params.slug.join('/'))
  const pair = await getPostPair(slug)
  const post = pair[0]
  if (!post) {
    if ((await getPostStatusBySlug(slug)) === 'private') {
      return { title: '비공개 글', robots: { index: false, follow: false } }
    }
    return
  }
  const authorList = post.authors || ['default']
  const authorDetails = authorList.map((author) => {
    const authorResults = allAuthors.find((p) => p.slug === author)
    return coreContent(authorResults as Authors)
  })

  const publishedAt = new Date(post.date).toISOString()
  const modifiedAt = new Date(post.lastmod || post.date).toISOString()
  const authors = authorDetails.map((author) => author.name)
  let imageList = [siteMetadata.socialBanner]
  if (post.images) {
    imageList = typeof post.images === 'string' ? [post.images] : post.images
  }
  const ogImages = imageList.map((img) => {
    return {
      url: img?.includes('http') ? img : siteMetadata.siteUrl + img,
    }
  })

  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      siteName: siteMetadata.title,
      locale: post.language === 'ko' ? 'ko_KR' : 'en_US',
      type: 'article',
      publishedTime: publishedAt,
      modifiedTime: modifiedAt,
      url: './',
      images: ogImages,
      authors: authors.length > 0 ? authors : [siteMetadata.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
      images: imageList,
    },
  }
}

export default async function Page(props: { params: Promise<{ slug: string[] }> }) {
  const params = await props.params
  const slug = decodeURI(params.slug.join('/'))

  // 해당 slug의 언어별 문서(본문 포함)와 전체 목록(본문 제외 — prev/next 계산용)
  const [pair, cores] = await Promise.all([getPostPair(slug), getPublishedCores()])
  if (pair.length === 0) {
    // 존재하지만 비공개인 글은 404 대신 안내 페이지
    if ((await getPostStatusBySlug(slug)) === 'private') {
      return <PrivatePostNotice />
    }
    return notFound()
  }

  const post = pair[0]
  const authorList = post.authors || ['default']
  const authorDetails = authorList.map((author) => {
    const authorResults = allAuthors.find((p) => p.slug === author)
    return coreContent(authorResults as Authors)
  })

  // BlogPostClient는 현재 slug 문서에서만 body를 사용하므로 나머지는 본문 없이 전달
  const allPosts = [
    ...pair,
    ...cores.filter((c) => c.slug !== slug).map((c) => ({ ...c, body: { code: '' } })),
  ]

  return <BlogPostClient slug={slug} allPosts={allPosts} authorDetails={authorDetails} />
}
