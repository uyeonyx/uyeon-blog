import { put } from '@vercel/blob'
import { imageSize } from 'image-size'
import type { NextRequest } from 'next/server'
import { requireAdminApi } from '@/lib/admin/session'

// SVG는 받지 않는다 — 스크립트를 품을 수 있는 유일한 이미지 형식이고 에디터에 정당한 용도가 없다
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
}
// imageSize()가 스니핑한 실제 형식 ↔ 선언된 MIME 대조용 (image-size는 jpeg를 'jpg'로 보고한다)
const SNIFFED_TYPE_BY_MIME: Record<string, string[]> = {
  'image/png': ['png'],
  'image/jpeg': ['jpg'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'image/avif': ['avif', 'mif1', 'msf1'],
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

  // 매직바이트 스니핑 — file.type은 브라우저가 보내는 값이라 신뢰하지 않는다
  let width: number | undefined
  let height: number | undefined
  try {
    const dim = imageSize(buffer)
    width = dim.width
    height = dim.height
    if (!dim.type || !SNIFFED_TYPE_BY_MIME[file.type]?.includes(dim.type)) {
      return Response.json(
        { error: `파일 내용이 선언된 형식(${file.type})과 다릅니다` },
        { status: 400 }
      )
    }
  } catch {
    return Response.json({ error: '이미지 파일로 해석할 수 없습니다' }, { status: 400 })
  }

  const slug = formData?.get('slug')
  const prefix = typeof slug === 'string' && slug ? slug : 'uploads'
  // scope: Blob 경로 최상위 디렉터리 (posts/projects/about) — 기본 posts (하위호환)
  const rawScope = formData?.get('scope')
  const scope =
    typeof rawScope === 'string' && ['posts', 'projects', 'about'].includes(rawScope)
      ? rawScope
      : 'posts'
  const blob = await put(`${scope}/${prefix}/${crypto.randomUUID()}.${ext}`, buffer, {
    access: 'public',
    contentType: file.type,
  })

  // ?w=&h= 힌트를 URL에 실어준다 — 순수 마크다운(![]())으로 삽입돼도
  // components/Image.tsx가 치수를 복원해 CLS를 막을 수 있다 (스키마 변경 불필요)
  const url = width && height ? `${blob.url}?w=${width}&h=${height}` : blob.url
  return Response.json({ url, width, height })
}
