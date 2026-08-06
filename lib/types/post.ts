// DB 기반 블로그 글 DTO — 기존 contentlayer Blog 문서와 호환되는 shape.
// 렌더링 코드(layouts, BlogPostClient 등)는 이 타입만 바라본다.

export interface PostBody {
  code: string
}

export interface Post {
  slug: string
  path: string
  filePath: string
  title: string
  summary?: string
  date: string
  lastmod?: string
  tags: string[]
  draft?: boolean
  language: string
  layout?: string
  // biome-ignore lint/suspicious/noExplicitAny: contentlayer Blog와 동일하게 json 필드
  images?: any
  authors?: string[]
  bibliography?: string
  canonicalUrl?: string
  // biome-ignore lint/suspicious/noExplicitAny: pliny Toc
  toc: any
  // biome-ignore lint/suspicious/noExplicitAny: reading-time 결과
  readingTime: any
  // biome-ignore lint/suspicious/noExplicitAny: JSON-LD
  structuredData: any
  body: PostBody
}

export type PostCore = Omit<Post, 'body'>

// 기존 `import type { Blog } from 'contentlayer/generated'` 소비처를 위한 별칭
export type Blog = Post
