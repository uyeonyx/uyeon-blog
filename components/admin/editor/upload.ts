import type { Editor } from '@tiptap/core'

export interface UploadedImage {
  url: string
  width?: number
  height?: number
}

export type UploadScope = 'posts' | 'projects' | 'about'

export async function uploadImageFile(
  file: File,
  slug?: string,
  scope: UploadScope = 'posts'
): Promise<UploadedImage> {
  const formData = new FormData()
  formData.append('file', file)
  if (slug) formData.append('slug', slug)
  formData.append('scope', scope)

  const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || '이미지 업로드에 실패했습니다')
  }
  return data
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
