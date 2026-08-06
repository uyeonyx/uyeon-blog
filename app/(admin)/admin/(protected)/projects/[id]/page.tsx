import { notFound } from 'next/navigation'
import ProjectEditor, { type ProjectEditorData } from '@/components/admin/ProjectEditor'
import { getProjectForEdit } from '@/lib/admin/project-service'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const metadata = { title: '프로젝트 편집' }

export default async function EditProjectPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_PATTERN.test(id)) notFound()

  const found = await getProjectForEdit(id)
  if (!found) notFound()

  const { project, translations } = found
  const initial: ProjectEditorData = {
    id: project.id,
    slug: project.slug,
    published: project.published,
    displayOrder: project.displayOrder,
    imgSrc: project.imgSrc,
    href: project.href,
    tags: project.tags,
    translations: Object.fromEntries(
      translations.map((t) => [
        t.language,
        {
          title: t.title,
          description: t.description,
          period: t.period,
          role: t.role,
          company: t.company,
          contentJson: t.contentJson,
        },
      ])
    ),
  }

  return <ProjectEditor initial={initial} />
}
