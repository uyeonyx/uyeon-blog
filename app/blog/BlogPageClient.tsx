'use client'

import type { Blog } from 'contentlayer/generated'
import type { CoreContent } from 'pliny/utils/contentlayer'
import { useMemo } from 'react'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { filterPostsByLanguage } from '@/lib/i18n/filter-posts'
import { useI18n } from '@/lib/i18n/i18n-context'

interface BlogPageClientProps {
  allPosts: CoreContent<Blog>[]
  postsPerPage: number
  pageNumber: number
}

export default function BlogPageClient({
  allPosts,
  postsPerPage,
  pageNumber,
}: BlogPageClientProps) {
  const { locale, t } = useI18n()

  // 언어별로 포스트 필터링
  const posts = useMemo(
    // biome-ignore lint/suspicious/noExplicitAny: Contentlayer types will include language at runtime
    () => filterPostsByLanguage(allPosts as any, locale) as CoreContent<Blog>[],
    [allPosts, locale]
  )

  const totalPages = Math.ceil(posts.length / postsPerPage)
  const initialDisplayPosts = posts.slice(0, postsPerPage * pageNumber)
  const pagination = {
    currentPage: pageNumber,
    totalPages: totalPages,
  }

  return (
    <ListLayout
      posts={posts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={pagination}
      title={t('blog.allPosts')}
    />
  )
}
