import ProjectAdminList, { type ProjectAdminItem } from '@/components/admin/ProjectAdminList'
import { listProjects } from '@/lib/admin/project-service'

export const metadata = { title: '프로젝트 관리' }

export default async function AdminProjectListPage() {
  const items: ProjectAdminItem[] = (await listProjects()).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    published: p.published,
    displayOrder: p.displayOrder,
    compileOk: p.compileOk,
  }))

  return <ProjectAdminList items={items} />
}
