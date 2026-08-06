'use client'

import 'css/prism.css'
import 'katex/dist/katex.css'

import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
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
  post: Blog
  authorDetails: AuthorCore[]
  prev?: PostCore
  next?: PostCore
}

/**
 * 언어 선택과 prev/next 계산은 서버에서 끝난다. 여기는 클라이언트 레이아웃 렌더 전용.
 */
export default function BlogPostClient({ post, authorDetails, prev, next }: BlogPostClientProps) {
  const { body, ...mainContent } = post
  const Layout = layouts[post.layout || defaultLayout]

  return (
    <Layout
      content={mainContent as CoreContent<Blog>}
      authorDetails={authorDetails}
      next={next}
      prev={prev}
    >
      <MDXLayoutRenderer code={body.code} components={components} toc={post.toc} />
    </Layout>
  )
}
