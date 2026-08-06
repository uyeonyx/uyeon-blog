import type { NextRequest } from 'next/server'
import { requireAdminApi } from '@/lib/admin/session'
import { compilePostMdx } from '@/lib/mdx/compile'
import { serializeToMdx } from '@/lib/mdx/serialize'

export async function POST(request: NextRequest) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const body = await request.json().catch(() => null)
  if (!body?.contentJson) {
    return Response.json({ error: 'contentJson이 필요합니다' }, { status: 400 })
  }

  try {
    const mdx = serializeToMdx(body.contentJson)
    const compiled = await compilePostMdx(mdx)
    return Response.json({ code: compiled.code, toc: compiled.toc, mdx })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : '컴파일에 실패했습니다' },
      { status: 422 }
    )
  }
}
