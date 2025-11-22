import type { Blog } from 'contentlayer/generated'
import type { CoreContent } from 'pliny/utils/contentlayer'

// Blog 타입 확장 - language 속성 추가
export type BlogWithLanguage = Blog & {
  language: string
}

export type CoreBlogWithLanguage = CoreContent<Blog> & {
  language?: string
}
