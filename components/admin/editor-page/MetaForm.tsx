'use client'

import { Icon } from '@iconify/react'
import { useRef, useState } from 'react'
import { uploadImageFile } from '@/components/admin/editor/upload'
import { AdminInput, AdminSelect, GlassCard } from '@/components/admin/ui/primitives'
import { useAdminToast } from '@/components/admin/ui/toast'

interface MetaFormProps {
  slug: string
  setSlug: (v: string) => void
  slugLocked: boolean
  tags: string
  setTags: (v: string) => void
  date: string
  setDate: (v: string) => void
  layout: string
  setLayout: (v: string) => void
  coverImage: string
  setCoverImage: (v: string) => void
}

export default function MetaForm({
  slug,
  setSlug,
  slugLocked,
  tags,
  setTags,
  date,
  setDate,
  layout,
  setLayout,
  coverImage,
  setCoverImage,
}: MetaFormProps) {
  const { toast } = useAdminToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const uploadCover = async (file: File) => {
    setUploading(true)
    try {
      const uploaded = await uploadImageFile(file, slug, 'posts')
      setCoverImage(uploaded.url)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : '이미지 업로드에 실패했습니다')
    } finally {
      setUploading(false)
    }
  }
  return (
    <GlassCard innerClassName="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 text-sm">
        <label
          htmlFor="meta-slug"
          className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300"
        >
          Slug
          {slugLocked && (
            <span
              className="flex items-center gap-1 text-xs text-gray-400"
              title="게시된 글의 slug는 변경할 수 없습니다"
            >
              <Icon icon="solar:lock-keyhole-minimalistic-bold" className="size-3.5" />
              잠김
            </span>
          )}
        </label>
        <AdminInput
          id="meta-slug"
          type="text"
          value={slug}
          disabled={slugLocked}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="my-post-slug"
        />
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="meta-tags" className="font-medium text-gray-700 dark:text-gray-300">
          태그 (콤마 구분)
        </label>
        <AdminInput
          id="meta-tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="nextjs, ai"
        />
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="meta-date" className="font-medium text-gray-700 dark:text-gray-300">
          게시일
        </label>
        <AdminInput
          id="meta-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="meta-layout" className="font-medium text-gray-700 dark:text-gray-300">
          레이아웃
        </label>
        <AdminSelect id="meta-layout" value={layout} onChange={(e) => setLayout(e.target.value)}>
          <option value="">기본 (PostLayout)</option>
          <option value="PostLayout">PostLayout</option>
          <option value="PostSimple">PostSimple</option>
          <option value="PostBanner">PostBanner</option>
        </AdminSelect>
      </div>
      <div className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <label htmlFor="meta-cover" className="font-medium text-gray-700 dark:text-gray-300">
          대표 이미지
        </label>
        <div className="flex items-center gap-2">
          <AdminInput
            id="meta-cover"
            type="text"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="URL을 붙여넣거나 업로드하세요 (권장 1200×630)"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadCover(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white/60 px-3 py-2 font-medium text-gray-700 transition hover:bg-white disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Icon
              icon={uploading ? 'solar:refresh-bold' : 'solar:upload-minimalistic-bold'}
              className={`size-4 ${uploading ? 'animate-spin' : ''}`}
            />
            {uploading ? '업로드 중' : '업로드'}
          </button>
        </div>
        {coverImage.trim() && (
          <div className="mt-1 flex items-start gap-2">
            {/* biome-ignore lint/performance/noImgElement: admin 미리보기 — 최적화 불필요 */}
            <img
              src={coverImage.trim()}
              alt="대표 이미지 미리보기"
              className="h-24 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
            />
            <button
              type="button"
              onClick={() => setCoverImage('')}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
            >
              <Icon icon="solar:trash-bin-minimalistic-bold" className="size-3.5" />
              제거
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
