'use client'

import 'css/prism.css'
import 'katex/dist/katex.css'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDirtyGuard } from './DirtyGuard'
import TiptapEditor from './editor/TiptapEditor'
import type { Language } from './editor-page/LanguageTabs'
import LanguageTabs from './editor-page/LanguageTabs'
import PreviewDialog, { type PreviewData } from './editor-page/PreviewDialog'
import ConfirmDialog from './ui/ConfirmDialog'
import { AdminButton, AdminInput, GlassCard } from './ui/primitives'
import { useAdminToast } from './ui/toast'

const LANGUAGES: Language[] = ['ko', 'en']

interface TranslationState {
  title: string
  description: string
  period: string
  role: string
  company: string
  // biome-ignore lint/suspicious/noExplicitAny: Tiptap JSON 문서
  contentJson: any
}

export interface ProjectEditorData {
  id: string
  slug: string
  published: boolean
  displayOrder: number
  imgSrc: string | null
  href: string | null
  tags: string[]
  translations: Partial<
    Record<
      Language,
      {
        title: string
        description: string | null
        period: string | null
        role: string | null
        company: string | null
        contentJson: unknown
      }
    >
  >
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {children}
    </div>
  )
}

export default function ProjectEditor({ initial }: { initial: ProjectEditorData }) {
  const router = useRouter()
  const { toast } = useAdminToast()
  const { setDirty } = useDirtyGuard()

  const [slug, setSlug] = useState(initial.slug)
  const [published, setPublished] = useState(initial.published)
  const [displayOrder, setDisplayOrder] = useState(String(initial.displayOrder))
  const [imgSrc, setImgSrc] = useState(initial.imgSrc ?? '')
  const [href, setHref] = useState(initial.href ?? '')
  const [tags, setTags] = useState(initial.tags.join(', '))
  const [activeLang, setActiveLang] = useState<Language>('ko')
  const [translations, setTranslations] = useState<Record<Language, TranslationState>>({
    ko: {
      title: initial.translations.ko?.title ?? '',
      description: initial.translations.ko?.description ?? '',
      period: initial.translations.ko?.period ?? '',
      role: initial.translations.ko?.role ?? '',
      company: initial.translations.ko?.company ?? '',
      contentJson: initial.translations.ko?.contentJson ?? null,
    },
    en: {
      title: initial.translations.en?.title ?? '',
      description: initial.translations.en?.description ?? '',
      period: initial.translations.en?.period ?? '',
      role: initial.translations.en?.role ?? '',
      company: initial.translations.en?.company ?? '',
      contentJson: initial.translations.en?.contentJson ?? null,
    },
  })
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const snapshot = useMemo(
    () => JSON.stringify({ slug, published, displayOrder, imgSrc, href, tags, translations }),
    [slug, published, displayOrder, imgSrc, href, tags, translations]
  )
  const [lastSaved, setLastSaved] = useState(snapshot)
  const isDirty = snapshot !== lastSaved

  useEffect(() => {
    setDirty(isDirty)
    return () => setDirty(false)
  }, [isDirty, setDirty])

  const updateTranslation = useCallback((lang: Language, patch: Partial<TranslationState>) => {
    setTranslations((prev) => ({ ...prev, [lang]: { ...prev[lang], ...patch } }))
  }, [])

  const savingRef = useRef(false)

  const save = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) return false
    savingRef.current = true
    setSaving(true)
    const currentSnapshot = JSON.stringify({
      slug,
      published,
      displayOrder,
      imgSrc,
      href,
      tags,
      translations,
    })
    try {
      const res = await fetch(`/api/admin/projects/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          published,
          displayOrder: Number.parseInt(displayOrder, 10) || 0,
          imgSrc,
          href,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          translations,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast('error', data.error || '저장에 실패했습니다')
        return false
      }
      const failures = (data.compileResults ?? []).filter((r: { ok: boolean }) => !r.ok) as Array<{
        language: string
        error?: string
      }>
      setLastSaved(currentSnapshot)
      if (failures.length > 0) {
        toast(
          'error',
          `저장은 되었지만 컴파일 실패: ${failures.map((f) => `[${f.language}] ${f.error}`).join(' / ')}`
        )
        return false
      }
      toast('success', '저장되었습니다')
      return true
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [initial.id, slug, published, displayOrder, imgSrc, href, tags, translations, toast])

  const saveRef = useRef(save)
  saveRef.current = save

  // Cmd/Ctrl+S 저장
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (!savingRef.current) saveRef.current()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const remove = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/projects/${initial.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDirty(false)
        setDeleteOpen(false)
        router.push('/admin/projects')
        router.refresh()
      } else {
        const data = await res.json()
        toast('error', data.error || '삭제에 실패했습니다')
      }
    } finally {
      setDeleting(false)
    }
  }

  const openPreview = async () => {
    setPreviewLoading(true)
    try {
      const res = await fetch('/api/admin/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentJson: translations[activeLang].contentJson }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast('error', data.error || '미리보기 컴파일에 실패했습니다')
        return
      }
      setPreview({ code: data.code, lang: activeLang })
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* 액션 바 */}
      <motion.div variants={item} className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            published
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
          }`}
        >
          <Icon
            icon={published ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
            className="size-3.5"
          />
          {published ? '공개' : '비공개'}
        </span>
        {isDirty && (
          <span className="text-xs text-amber-600 dark:text-amber-400">저장되지 않은 변경</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <AdminButton onClick={() => setPublished((p) => !p)}>
            <Icon
              icon={published ? 'solar:eye-closed-bold' : 'solar:eye-bold'}
              className="size-4"
            />
            {published ? '비공개로' : '공개로'}
          </AdminButton>
          <AdminButton onClick={openPreview} disabled={previewLoading}>
            <Icon
              icon={previewLoading ? 'solar:refresh-bold' : 'solar:document-text-bold'}
              className={`size-4 ${previewLoading ? 'animate-spin' : ''}`}
            />
            미리보기
          </AdminButton>
          <AdminButton variant="danger" onClick={() => setDeleteOpen(true)}>
            <Icon icon="solar:trash-bin-trash-bold" className="size-4" />
            삭제
          </AdminButton>
          <AdminButton variant="primary" onClick={() => save()} disabled={saving || !isDirty}>
            <Icon
              icon={saving ? 'solar:refresh-bold' : 'solar:diskette-bold'}
              className={`size-4 ${saving ? 'animate-spin' : ''}`}
            />
            저장
          </AdminButton>
        </div>
      </motion.div>

      {/* 메타 정보 */}
      <motion.div variants={item}>
        <GlassCard innerClassName="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <MetaField label="Slug">
            <AdminInput
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="my-project"
            />
          </MetaField>
          <MetaField label="링크 (href)">
            <AdminInput
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="https://…"
            />
          </MetaField>
          <MetaField label="표시 순서">
            <AdminInput
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
            />
          </MetaField>
          <MetaField label="대표 이미지 URL">
            <AdminInput
              value={imgSrc}
              onChange={(e) => setImgSrc(e.target.value)}
              placeholder="(선택)"
            />
          </MetaField>
          <MetaField label="태그 (쉼표 구분)">
            <AdminInput
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Next.js, TypeScript"
            />
          </MetaField>
        </GlassCard>
      </motion.div>

      {/* 언어별 편집 */}
      <motion.div variants={item} className="space-y-4">
        <LanguageTabs
          activeLang={activeLang}
          setActiveLang={setActiveLang}
          completeness={{
            ko: !!translations.ko.title.trim(),
            en: !!translations.en.title.trim(),
          }}
        />

        {LANGUAGES.map((lang) => (
          <div key={lang} className={lang === activeLang ? 'space-y-3' : 'hidden'}>
            <input
              type="text"
              value={translations[lang].title}
              onChange={(e) => updateTranslation(lang, { title: e.target.value })}
              placeholder={lang === 'ko' ? '프로젝트 이름' : 'Project title'}
              className="w-full border-0 bg-transparent text-3xl font-bold tracking-tight text-gray-900 placeholder:text-gray-300 focus:ring-0 focus:outline-none sm:text-4xl dark:text-gray-100 dark:placeholder:text-gray-700"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetaField label={lang === 'ko' ? '기간' : 'Period'}>
                <AdminInput
                  value={translations[lang].period}
                  onChange={(e) => updateTranslation(lang, { period: e.target.value })}
                  placeholder="2024.01 - 2024.12"
                />
              </MetaField>
              <MetaField label={lang === 'ko' ? '역할' : 'Role'}>
                <AdminInput
                  value={translations[lang].role}
                  onChange={(e) => updateTranslation(lang, { role: e.target.value })}
                  placeholder={lang === 'ko' ? '백엔드 개발' : 'Backend Engineer'}
                />
              </MetaField>
              <MetaField label={lang === 'ko' ? '회사/소속' : 'Company'}>
                <AdminInput
                  value={translations[lang].company}
                  onChange={(e) => updateTranslation(lang, { company: e.target.value })}
                />
              </MetaField>
            </div>
            <div className="border-l-2 border-gray-200 pl-4 dark:border-gray-700">
              <p className="mb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                {lang === 'ko' ? '설명' : 'Description'}
              </p>
              <AdminInput
                value={translations[lang].description}
                onChange={(e) => updateTranslation(lang, { description: e.target.value })}
                placeholder={
                  lang === 'ko' ? '카드에 표시될 한 줄 설명' : 'One-line description for the card'
                }
              />
            </div>
            <div className="relative rounded-2xl border border-white/60 bg-white/70 shadow-xl shadow-gray-900/10 backdrop-blur-xl before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:border-gray-700/80 dark:bg-gray-900/70 dark:shadow-primary-500/10 dark:before:from-white/5">
              <div className="relative p-5">
                <TiptapEditor
                  value={translations[lang].contentJson}
                  onChange={(json) => updateTranslation(lang, { contentJson: json })}
                  slug={slug}
                  scope="projects"
                  placeholder={lang === 'ko' ? '프로젝트 상세 내용…' : 'Project details…'}
                />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      <PreviewDialog
        preview={preview}
        title={preview ? translations[preview.lang].title : ''}
        summary={preview ? translations[preview.lang].description : ''}
        onClose={() => setPreview(null)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="프로젝트를 삭제할까요?"
        description="이 프로젝트와 모든 언어 버전이 완전히 삭제됩니다. 되돌릴 수 없습니다."
        confirmLabel="삭제"
        danger
        busy={deleting}
        onConfirm={remove}
      />
    </motion.div>
  )
}
