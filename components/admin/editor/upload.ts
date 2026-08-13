import type { Editor } from '@tiptap/core'
import { adminFetch } from '@/lib/admin/fetch'

export interface UploadedImage {
  url: string
  width?: number
  height?: number
}

export type UploadScope = 'posts' | 'projects' | 'about'

/** 호출부가 try/catch로 감싸 토스트를 띄우는 계약 — 실패는 메시지를 담아 던진다 */
export async function uploadImageFile(
  file: File,
  slug?: string,
  scope: UploadScope = 'posts'
): Promise<UploadedImage> {
  const formData = new FormData()
  formData.append('file', file)
  if (slug) formData.append('slug', slug)
  formData.append('scope', scope)

  const result = await adminFetch<UploadedImage>('/api/admin/upload', {
    method: 'POST',
    body: formData,
  })
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}

export async function insertImageFromFile(
  editor: Editor,
  file: File,
  slug?: string,
  pos?: number,
  scope: UploadScope = 'posts'
) {
  const uploaded = await uploadImageFile(file, slug, scope)
  const attrs = {
    src: uploaded.url,
    alt: file.name.replace(/\.[a-z0-9]+$/i, ''),
    width: uploaded.width ?? null,
    height: uploaded.height ?? null,
  }
  if (typeof pos === 'number') {
    editor.chain().focus().insertContentAt(pos, { type: 'image', attrs }).run()
  } else {
    editor.chain().focus().insertContent({ type: 'image', attrs }).run()
  }
}
