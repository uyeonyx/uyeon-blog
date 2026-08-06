import type { NextRequest } from 'next/server'
import { LANGUAGES } from '@/lib/admin/post-service'
import {
  deleteProject,
  getProjectForEdit,
  revalidateProjects,
  saveProjectTranslation,
  touchProject,
  updateProjectMeta,
} from '@/lib/admin/project-service'
import { requireAdminApi } from '@/lib/admin/session'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const { id } = await params
  const found = await getProjectForEdit(id)
  if (!found) return Response.json({ error: 'Not found' }, { status: 404 })

  const { project, translations } = found
  return Response.json({
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
          compileOk: !!t.compiledCode || !t.contentMd.trim(),
        },
      ])
    ),
  })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 })

  const metaResult = await updateProjectMeta(id, {
    slug: typeof body.slug === 'string' ? body.slug : undefined,
    published: typeof body.published === 'boolean' ? body.published : undefined,
    displayOrder: Number.isInteger(body.displayOrder) ? body.displayOrder : undefined,
    imgSrc: typeof body.imgSrc === 'string' ? body.imgSrc : undefined,
    href: typeof body.href === 'string' ? body.href : undefined,
    tags: Array.isArray(body.tags)
      ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : undefined,
  })
  if (!metaResult.ok) {
    if (metaResult.error === 'not_found') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    if (metaResult.error === 'invalid_slug') {
      return Response.json(
        { error: 'slug는 소문자/숫자/하이픈만 사용할 수 있습니다' },
        { status: 400 }
      )
    }
    return Response.json({ error: '이미 존재하는 slug입니다' }, { status: 409 })
  }

  const compileResults: Awaited<ReturnType<typeof saveProjectTranslation>>[] = []
  for (const language of LANGUAGES) {
    const input = body.translations?.[language]
    if (input) {
      compileResults.push(
        await saveProjectTranslation(id, language, {
          title: String(input.title ?? ''),
          description: input.description ? String(input.description) : null,
          period: input.period ? String(input.period) : null,
          role: input.role ? String(input.role) : null,
          company: input.company ? String(input.company) : null,
          contentJson: input.contentJson ?? null,
        })
      )
    }
  }

  await touchProject(id)
  revalidateProjects()
  return Response.json({ ok: true, compileResults })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const { id } = await params
  const deleted = await deleteProject(id)
  if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 })

  revalidateProjects()
  return Response.json({ ok: true })
}
