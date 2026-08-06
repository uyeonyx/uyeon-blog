// components/TechStack.tsx의 TechCategory shape
export interface TechItem {
  name: string
  items: string[]
}

export interface TechCategory {
  title: string
  techs: TechItem[]
}

// components/Timeline.tsx의 TimelineItem shape
export interface TimelineItem {
  period: string
  title: string
  company: string
  description: string
  link?: string
}

/** 본문 없는 작성자 정보 — 블로그 글 하단/메타데이터용 */
export interface AuthorCore {
  slug: string
  language: string
  name: string
  avatar?: string
  occupation?: string
  company?: string
  email?: string
  github?: string
  linkedin?: string
  twitter?: string
  bluesky?: string
}

/** about 페이지용 — 구조화 데이터(techStack/timeline) + 컴파일된 소개글 */
export interface Author extends AuthorCore {
  techStack: TechCategory[]
  timeline: TimelineItem[]
  body: { code: string }
}
