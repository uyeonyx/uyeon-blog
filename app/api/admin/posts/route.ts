import type { NextRequest } from 'next/server'
import {
  createPost,
  listAdminPosts,
  type PostStatus,
  revalidatePosts,
} from '@/lib/admin/post-service'
import { requireAdminApi } from '@/lib/admin/session'
import { revalidateTagMaster } from '@/lib/admin/tag-service'

function parseStatus(value: string | null): PostStatus | undefined {
  return value === 'draft' || value === 'published' || value === 'private' || value === 'archived'
    ? value
    : undefined
}

export async function GET(request: NextRequest) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const items = await listAdminPosts(parseStatus(request.nextUrl.searchParams.get('status')))
  return Response.json({ items })
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const body = await request.json().catch(() => null)
  const slug = typeof body?.slug === 'string' ? body.slug : ''

  const result = await createPost(slug)
  if (!result.ok) {
    if (result.error === 'invalid_slug') {
      return Response.json(
        { error: 'slug는 소문자/숫자/하이픈만 사용할 수 있습니다' },
        { status: 400 }
      )
    }
    return Response.json({ error: '이미 존재하는 slug입니다' }, { status: 409 })
  }

  revalidatePosts()
  if (result.createdTags.length > 0) revalidateTagMaster()
  return Response.json({ id: result.id, slug: result.slug }, { status: 201 })
}
