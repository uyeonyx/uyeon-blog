'use client'

import { Icon } from '@iconify/react'
import { useRef, useState } from 'react'
import { uploadImageFile } from '@/components/admin/editor/upload'
import type { Language } from '@/components/admin/editor-page/LanguageTabs'
import TagInput from '@/components/admin/editor-page/TagInput'
import { AdminInput, AdminSelect, GlassCard } from '@/components/admin/ui/primitives'
import { useAdminToast } from '@/components/admin/ui/toast'

interface MetaFormProps {
  slug: string
  setSlug: (v: string) => void
  slugLocked: boolean
  tags: string[]
  setTags: (v: string[]) => void
  date: string
  setDate: (v: string) => void
  layout: string
  setLayout: (v: string) => void
  coverImage: string
  setCoverImage: (v: string) => void
  langCovers: Record<Language, string>
  setLangCover: (lang: Language, v: string) => void
}

const LANGUAGES: Language[] = ['ko', 'en']
const LANG_LABEL: Record<Language, string> = { ko: '한국어', en: '영어' }

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
  langCovers,
  setLangCover,
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
          태그
        </label>
        <TagInput inputId="meta-tags" value={tags} onChange={setTags} />
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
      <CoverField
        id="meta-cover"
        label="대표 이미지"
        hint="URL을 붙여넣거나 업로드하세요 (권장 1200×630)"
        value={coverImage}
        onChange={setCoverImage}
        slug={slug}
      />
      {LANGUAGES.map((lang) => (
        <CoverField
          key={lang}
          id={`meta-cover-${lang}`}
          label={`${LANG_LABEL[lang]} 전용 대표 이미지`}
          hint="비우면 위의 대표 이미지를 씁니다 (썸네일에 글자가 있을 때)"
          value={langCovers[lang]}
          onChange={(v) => setLangCover(lang, v)}
          slug={slug}
          compact
        />
      ))}
    </GlassCard>
  )
}

/** URL 입력 + 업로드 + 미리보기/제거 — 공통 대표 이미지와 언어 전용 이미지가 같이 쓴다 */
function CoverField({
  id,
  label,
  hint,
  value,
  onChange,
  slug,
  compact = false,
}: {
  id: string
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  slug: string
  compact?: boolean
}) {
  const { toast } = useAdminToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const uploaded = await uploadImageFile(file, slug, 'posts')
      onChange(uploaded.url)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : '이미지 업로드에 실패했습니다')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`flex flex-col gap-1.5 text-sm ${compact ? '' : 'sm:col-span-2'}`}>
      <label htmlFor={id} className="font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <AdminInput
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hint}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload(file)
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
      {value.trim() && (
        <div className="mt-1 flex items-start gap-2">
          {/* biome-ignore lint/performance/noImgElement: admin 미리보기 — 최적화 불필요 */}
          <img
            src={value.trim()}
            alt={`${label} 미리보기`}
            className={`${compact ? 'h-16' : 'h-24'} rounded-lg border border-gray-200 object-cover dark:border-gray-700`}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
          >
            <Icon icon="solar:trash-bin-minimalistic-bold" className="size-3.5" />
            제거
          </button>
        </div>
      )}
    </div>
  )
}
