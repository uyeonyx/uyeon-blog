'use client'

import 'css/prism.css'
import 'katex/dist/katex.css'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDirtyGuard } from './DirtyGuard'
import TiptapEditor from './editor/TiptapEditor'
import ActionBar from './editor-page/ActionBar'
import type { Language } from './editor-page/LanguageTabs'
import LanguageTabs from './editor-page/LanguageTabs'
import MetaForm from './editor-page/MetaForm'
import PreviewDialog, { type PreviewData } from './editor-page/PreviewDialog'
import ConfirmDialog from './ui/ConfirmDialog'
import type { PostStatus } from './ui/primitives'
import { STATUS_LABEL } from './ui/primitives'
import { useAdminToast } from './ui/toast'

const LANGUAGES: Language[] = ['ko', 'en']

interface TranslationState {
  title: string
  summary: string
  // biome-ignore lint/suspicious/noExplicitAny: Tiptap JSON 문서
  contentJson: any
}

export interface PostEditorData {
  id: string
  slug: string
  status: PostStatus
  tags: string[]
  layout: string | null
  date: string | null
  coverImage: string | null
  translations: Partial<
    Record<Language, { title: string; summary: string | null; contentJson: unknown }>
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

const AUTOSAVE_DEBOUNCE_MS = 5000

/** 내용에 따라 높이가 자동으로 늘어나는 요약 입력 — 내부 스크롤 없음 */
function SummaryTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  // 초기 값/탭 전환 후 표시 시 높이 보정
  // biome-ignore lint/correctness/useExhaustiveDependencies: value 변경 시 높이 재계산 필요
  useEffect(() => {
    resize()
  }, [value, resize])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      placeholder={placeholder}
      rows={2}
      className="w-full resize-none overflow-hidden border-0 bg-transparent text-base leading-relaxed text-gray-600 placeholder:text-gray-300 focus:ring-0 focus:outline-none dark:text-gray-400 dark:placeholder:text-gray-700"
    />
  )
}

export default function PostEditor({ initial }: { initial: PostEditorData }) {
  const router = useRouter()
  const { toast } = useAdminToast()
  const { setDirty } = useDirtyGuard()

  const [slug, setSlug] = useState(initial.slug)
  const [status, setStatus] = useState(initial.status)
  const [tags, setTags] = useState(initial.tags.join(', '))
  const [layout, setLayout] = useState(initial.layout ?? '')
  const [date, setDate] = useState(initial.date ? initial.date.slice(0, 10) : '')
  const [coverImage, setCoverImage] = useState(initial.coverImage ?? '')
  const [activeLang, setActiveLang] = useState<Language>('ko')
  const [translations, setTranslations] = useState<Record<Language, TranslationState>>({
    ko: {
      title: initial.translations.ko?.title ?? '',
      summary: initial.translations.ko?.summary ?? '',
      contentJson: initial.translations.ko?.contentJson ?? null,
    },
    en: {
      title: initial.translations.en?.title ?? '',
      summary: initial.translations.en?.summary ?? '',
      contentJson: initial.translations.en?.contentJson ?? null,
    },
  })
  const [saving, setSaving] = useState(false)
  const [autoSaveFailed, setAutoSaveFailed] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // dirty 추적 — 마지막 저장본 스냅샷과 현재 상태를 비교
  const snapshot = useMemo(
    () => JSON.stringify({ slug, tags, layout, date, coverImage, translations }),
    [slug, tags, layout, date, coverImage, translations]
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

  const save = useCallback(
    async ({ silent = false } = {}): Promise<boolean> => {
      if (savingRef.current) return false
      savingRef.current = true
      setSaving(true)
      const currentSnapshot = JSON.stringify({ slug, tags, layout, date, coverImage, translations })
      try {
        const res = await fetch(`/api/admin/posts/${initial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            tags: tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
            layout: layout || null,
            date: date || null,
            coverImage: coverImage.trim() || null,
            translations,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          if (silent) setAutoSaveFailed(true)
          else toast('error', data.error || '저장에 실패했습니다')
          return false
        }
        const failures = (data.compileResults ?? []).filter(
          (r: { ok: boolean }) => !r.ok
        ) as Array<{ language: string; error?: string }>
        setLastSaved(currentSnapshot)
        setLastSavedAt(new Date())
        setAutoSaveFailed(false)
        if (failures.length > 0) {
          if (!silent) {
            toast(
              'error',
              `저장은 되었지만 컴파일 실패: ${failures.map((f) => `[${f.language}] ${f.error}`).join(' / ')}`
            )
          }
          return false
        }
        if (!silent) toast('success', '저장되었습니다')
        return true
      } finally {
        savingRef.current = false
        setSaving(false)
      }
    },
    [initial.id, slug, tags, layout, date, coverImage, translations, toast]
  )

  const saveRef = useRef(save)
  saveRef.current = save

  // 초안 자동저장 — 변경이 발생했을 때만 마지막 편집 후 5초 뒤 1회 실행 (주기 폴링 없음)
  // biome-ignore lint/correctness/useExhaustiveDependencies: snapshot은 편집마다 디바운스 타이머를 리셋하기 위한 의도적 의존성
  useEffect(() => {
    if (status !== 'draft' || !isDirty || saving) return
    const timer = setTimeout(() => {
      saveRef.current({ silent: true })
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [snapshot, status, isDirty, saving])

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

  const changeStatus = async (next: PostStatus) => {
    const saved = await save()
    if (!saved && next === 'published') return
    const res = await fetch(`/api/admin/posts/${initial.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast('error', data.problems ? data.problems.join(' / ') : data.error || '상태 변경 실패')
      return
    }
    setStatus(next)
    toast('success', `상태가 '${STATUS_LABEL[next]}'(으)로 변경되었습니다`)
  }

  const remove = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/posts/${initial.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDirty(false)
        setDeleteOpen(false)
        router.push('/admin')
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
      <motion.div variants={item}>
        <ActionBar
          status={status}
          isDirty={isDirty}
          saving={saving}
          autoSaveFailed={autoSaveFailed}
          lastSavedAt={lastSavedAt}
          previewLoading={previewLoading}
          onPreview={openPreview}
          onSave={() => save()}
          onChangeStatus={changeStatus}
          onDelete={() => setDeleteOpen(true)}
        />
      </motion.div>

      <motion.div variants={item}>
        <MetaForm
          slug={slug}
          setSlug={setSlug}
          slugLocked={status !== 'draft'}
          tags={tags}
          setTags={setTags}
          date={date}
          setDate={setDate}
          layout={layout}
          setLayout={setLayout}
          coverImage={coverImage}
          setCoverImage={setCoverImage}
        />
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        <LanguageTabs
          activeLang={activeLang}
          setActiveLang={setActiveLang}
          completeness={{
            ko: !!translations.ko.title.trim(),
            en: !!translations.en.title.trim(),
          }}
        />

        {/* 언어별 편집 영역 — 탭 전환 시 에디터 상태 유지를 위해 둘 다 렌더하고 숨김 */}
        {LANGUAGES.map((lang) => (
          <div key={lang} className={lang === activeLang ? 'space-y-3' : 'hidden'}>
            <input
              type="text"
              value={translations[lang].title}
              onChange={(e) => updateTranslation(lang, { title: e.target.value })}
              placeholder={lang === 'ko' ? '제목을 입력하세요' : 'Title'}
              className="w-full border-0 bg-transparent text-3xl font-bold tracking-tight text-gray-900 placeholder:text-gray-300 focus:ring-0 focus:outline-none sm:text-4xl dark:text-gray-100 dark:placeholder:text-gray-700"
            />
            <div className="border-l-2 border-gray-200 pl-4 dark:border-gray-700">
              <p className="mb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                {lang === 'ko' ? '요약' : 'Summary'}
              </p>
              <SummaryTextarea
                value={translations[lang].summary}
                onChange={(v) => updateTranslation(lang, { summary: v })}
                placeholder={
                  lang === 'ko' ? '글 목록과 미리보기에 표시될 요약 (선택)' : 'Summary (optional)'
                }
              />
            </div>
            <div className="relative rounded-2xl border border-white/60 bg-white/70 shadow-xl shadow-gray-900/10 backdrop-blur-xl before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:border-gray-700/80 dark:bg-gray-900/70 dark:shadow-primary-500/10 dark:before:from-white/5">
              <div className="relative p-5">
                <TiptapEditor
                  value={translations[lang].contentJson}
                  onChange={(json) => updateTranslation(lang, { contentJson: json })}
                  slug={slug}
                />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      <PreviewDialog
        preview={preview}
        title={preview ? translations[preview.lang].title : ''}
        summary={preview ? translations[preview.lang].summary : ''}
        onClose={() => setPreview(null)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="글을 삭제할까요?"
        description="이 글과 모든 언어 버전이 완전히 삭제됩니다. 되돌릴 수 없습니다."
        confirmLabel="삭제"
        danger
        busy={deleting}
        onConfirm={remove}
      />
    </motion.div>
  )
}
