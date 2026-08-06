import type { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from './post'

// DB 기반 Post DTO는 language를 기본 포함한다 — 기존 이름 유지용 별칭
export type BlogWithLanguage = Blog

export type CoreBlogWithLanguage = CoreContent<Blog> & {
  language?: string
}
