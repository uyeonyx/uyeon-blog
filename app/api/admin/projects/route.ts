import type { NextRequest } from 'next/server'
import { createProject, listProjects, revalidateProjects } from '@/lib/admin/project-service'
import { requireAdminApi } from '@/lib/admin/session'

export async function GET() {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  return Response.json({ items: await listProjects() })
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const body = await request.json().catch(() => null)
  const slug = typeof body?.slug === 'string' ? body.slug : ''
  const result = await createProject(slug)
  if (!result.ok) {
    if (result.error === 'invalid_slug') {
      return Response.json(
        { error: 'slug는 소문자/숫자/하이픈만 사용할 수 있습니다' },
        { status: 400 }
      )
    }
    return Response.json({ error: '이미 존재하는 slug입니다' }, { status: 409 })
  }

  revalidateProjects()
  return Response.json({ id: result.id, slug: result.slug }, { status: 201 })
}
