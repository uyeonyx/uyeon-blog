'use client'

import { useMemo } from 'react'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { filterPostsByLanguage } from '@/lib/i18n/filter-posts'
import { useI18n } from '@/lib/i18n/i18n-context'
import type { PostCore } from '@/lib/types/post'

interface BlogPageClientProps {
  allPosts: PostCore[]
  tagCounts: Record<string, number>
  postsPerPage: number
  pageNumber: number
}

export default function BlogPageClient({
  allPosts,
  tagCounts,
  postsPerPage,
  pageNumber,
}: BlogPageClientProps) {
  const { locale, t } = useI18n()

  // 언어별로 포스트 필터링
  const posts = useMemo(() => filterPostsByLanguage(allPosts, locale), [allPosts, locale])

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
      tagCounts={tagCounts}
      title={t('blog.allPosts')}
    />
  )
}
