'use client'

import type { ReactNode } from 'react'
import PostBanner from '@/layouts/PostBanner'
import PostLayout from '@/layouts/PostLayout'
import PostSimple from '@/layouts/PostSimple'
import type { AuthorCore } from '@/lib/types/author'
import type { CoreContent } from '@/lib/types/content'
import type { Blog, PostCore } from '@/lib/types/post'

const defaultLayout = 'PostLayout'
const layouts = {
  PostSimple,
  PostLayout,
  PostBanner,
}

interface BlogPostClientProps {
  content: PostCore
  authorDetails: AuthorCore[]
  prev?: PostCore
  next?: PostCore
  /** 서버에서 이미 렌더된 본문 트리 (MDXServerRenderer) — 본문 평가는 클라이언트로 오지 않는다 */
  children: ReactNode
}

/**
 * 언어 선택·prev/next 계산·MDX 평가는 전부 서버에서 끝난다.
 * 여기는 framer-motion을 쓰는 클라이언트 레이아웃 껍데기만 담당한다.
 */
export default function BlogPostClient({
  content,
  authorDetails,
  prev,
  next,
  children,
}: BlogPostClientProps) {
  const Layout = layouts[(content.layout as keyof typeof layouts) || defaultLayout]

  return (
    <Layout
      content={content as CoreContent<Blog>}
      authorDetails={authorDetails}
      next={next}
      prev={prev}
    >
      {children}
    </Layout>
  )
}
