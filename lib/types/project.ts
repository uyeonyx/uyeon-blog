// components/ProjectCard.tsx의 project prop 구조적 타입을 그대로 충족한다.
export interface Project {
  slug: string
  language: string
  title: string
  description: string
  imgSrc?: string
  href?: string
  period?: string
  role?: string
  company?: string
  tags: string[]
  body: { code: string }
}
