'use client'

import { Icon } from '@iconify/react'
import { AdminInput, AdminSelect, GlassCard } from '@/components/admin/ui/primitives'

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
}: MetaFormProps) {
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
    </GlassCard>
  )
}
