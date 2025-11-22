'use client'

import 'css/prism.css'
import 'katex/dist/katex.css'

import type { Authors, Blog } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import type { CoreContent } from 'pliny/utils/contentlayer'
import { useEffect, useState } from 'react'
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
  prev: CoreContent<Blog> | null
  next: CoreContent<Blog> | null
}

export default function BlogPostClient({
  slug,
  allPosts,
  authorDetails,
  prev,
  next,
}: BlogPostClientProps) {
  const { locale, t } = useI18n()
  const [currentPost, setCurrentPost] = useState<Blog | null>(null)

  useEffect(() => {
    const post = findLocalizedPost(allPosts, slug, locale)
    setCurrentPost(post || null)
  }, [slug, locale, allPosts])

  if (!currentPost) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold">
            {t('blog.notAvailable')} {locale === 'ko' ? '한국어' : 'English'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t('blog.notAvailableDesc')}</p>
        </div>
      </div>
    )
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
      <Layout content={mainContent} authorDetails={authorDetails} next={next} prev={prev}>
        <MDXLayoutRenderer
          code={currentPost.body.code}
          components={components}
          toc={currentPost.toc}
        />
      </Layout>
    </>
  )
}
