// DB 기반 블로그 글 DTO — 기존 pliny 레이아웃들이 소비하는 shape.
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
  /** DB 저장 시각 — sitemap lastmod의 실질 소스 (lastmod는 수동 nullable이라 신뢰도가 낮다) */
  updatedAt?: string
  tags: string[]
  draft?: boolean
  language: string
  layout?: string
  /** images[0]이 대표이미지(OG/썸네일/배너) */
  images?: string[]
  authors?: string[]
  bibliography?: string
  canonicalUrl?: string
  // biome-ignore lint/suspicious/noExplicitAny: pliny Toc
  toc: any
  // biome-ignore lint/suspicious/noExplicitAny: reading-time 결과
  readingTime: any
  body: PostBody
}

export type PostCore = Omit<Post, 'body'>

// 기존 Blog 타입 소비처를 위한 별칭
export type Blog = Post
