import { genPageMetadata } from 'app/seo'
import { getPublishedProjects } from '@/lib/db/projects'
import ProjectsPageClient from './ProjectsPageClient'

// DB 조회 페이지 — 요청 시 렌더 (데이터는 'projects' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export const metadata = genPageMetadata({ title: 'Projects' })

export default async function Projects() {
  const projects = await getPublishedProjects()
  return <ProjectsPageClient projects={projects} />
}
