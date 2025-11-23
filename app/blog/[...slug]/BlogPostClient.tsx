'use client'

import 'css/prism.css'
import 'katex/dist/katex.css'

import type { Authors, Blog } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import type { CoreContent } from 'pliny/utils/contentlayer'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { useEffect, useMemo, useState } from 'react'
import { components } from '@/components/MDXComponents'
import PostBanner from '@/layouts/PostBanner'
import PostLayout from '@/layouts/PostLayout'
import PostSimple from '@/layouts/PostSimple'
import { findLocalizedPost } from '@/lib/i18n/filter-posts'
import { useI18n } from '@/lib/i18n/i18n-context'

const defaultLayout = 'PostLayout'
const layouts = {
  PostSimple,
  PostLayout,
  PostBanner,
}

interface BlogPostClientProps {
  slug: string
  allPosts: Blog[]
  authorDetails: CoreContent<Authors>[]
}

export default function BlogPostClient({ slug, allPosts, authorDetails }: BlogPostClientProps) {
  const { locale } = useI18n()
  // 초기 상태를 현재 locale의 포스트로 설정 (SSR과 클라이언트 모두 동일한 초기값)
  const [currentPost, setCurrentPost] = useState<Blog | null>(
    () => findLocalizedPost(allPosts, slug, locale) || null
  )

  useEffect(() => {
    const post = findLocalizedPost(allPosts, slug, locale)
    setCurrentPost(post || null)
  }, [slug, locale, allPosts])

  // 현재 언어에 맞는 포스트만 필터링하여 prev/next 계산
  const { localizedPrev, localizedNext } = useMemo(() => {
    // 현재 언어의 포스트만 필터링
    // biome-ignore lint/suspicious/noExplicitAny: Contentlayer types will include language at runtime
    const postsInCurrentLanguage = allPosts.filter((p: any) => p.language === locale)
    const sortedPosts = allCoreContent(sortPosts(postsInCurrentLanguage))
    const postIndex = sortedPosts.findIndex((p) => p.slug === slug)

    return {
      localizedPrev: postIndex !== -1 ? sortedPosts[postIndex + 1] || null : null,
      localizedNext: postIndex !== -1 ? sortedPosts[postIndex - 1] || null : null,
    }
  }, [allPosts, slug, locale])

  // 포스트가 없으면 아무것도 표시하지 않음 (레이아웃의 fade-in 효과로 자연스럽게)
  if (!currentPost) {
    return null
  }

  const mainContent: CoreContent<Blog> = {
    slug: currentPost.slug,
    date: currentPost.date,
    title: currentPost.title,
    tags: currentPost.tags,
    lastmod: currentPost.lastmod,
    draft: currentPost.draft,
    summary: currentPost.summary,
    images: currentPost.images,
    authors: currentPost.authors,
    layout: currentPost.layout,
    bibliography: currentPost.bibliography,
    canonicalUrl: currentPost.canonicalUrl,
    path: currentPost.path,
    filePath: currentPost.filePath,
    toc: currentPost.toc,
    readingTime: currentPost.readingTime,
  } as CoreContent<Blog>

  const jsonLd = currentPost.structuredData
  if (jsonLd) {
    jsonLd.author = authorDetails.map((author) => ({
      '@type': 'Person',
      name: author.name,
    }))
  }

  const Layout = layouts[currentPost.layout || defaultLayout]

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Layout
        content={mainContent}
        authorDetails={authorDetails}
        next={localizedNext}
        prev={localizedPrev}
      >
        <MDXLayoutRenderer
          code={currentPost.body.code}
          components={components}
          toc={currentPost.toc}
        />
      </Layout>
    </>
  )
}
