import type { Editor } from '@tiptap/core'

export interface UploadedImage {
  url: string
  width?: number
  height?: number
}

export async function uploadImageFile(file: File, slug?: string): Promise<UploadedImage> {
  const formData = new FormData()
  formData.append('file', file)
  if (slug) formData.append('slug', slug)

  const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || '이미지 업로드에 실패했습니다')
  }
  return data
}

export async function insertImageFromFile(editor: Editor, file: File, slug?: string, pos?: number) {
  const uploaded = await uploadImageFile(file, slug)
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
