import { put } from '@vercel/blob'
import { imageSize } from 'image-size'
import type { NextRequest } from 'next/server'
import { requireAdminApi } from '@/lib/admin/session'

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'file 필드가 필요합니다' }, { status: 400 })
  }

  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return Response.json(
      { error: `지원하지 않는 이미지 형식입니다: ${file.type}` },
      {
        status: 400,
      }
    )
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: '이미지는 10MB 이하여야 합니다' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let width: number | undefined
  let height: number | undefined
  try {
    const dim = imageSize(buffer)
    width = dim.width
    height = dim.height
  } catch {
    // SVG 등 치수 추출 실패는 허용 — 마크다운 이미지로 직렬화됨
  }

  const slug = formData?.get('slug')
  const prefix = typeof slug === 'string' && slug ? slug : 'uploads'
  const blob = await put(`posts/${prefix}/${crypto.randomUUID()}.${ext}`, buffer, {
    access: 'public',
    contentType: file.type,
  })

  return Response.json({ url: blob.url, width, height })
}
