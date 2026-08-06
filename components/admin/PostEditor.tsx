'use client'

import 'css/prism.css'
import 'katex/dist/katex.css'

import { useRouter } from 'next/navigation'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { useCallback, useEffect, useState } from 'react'
import { components } from '@/components/MDXComponents'
import TiptapEditor from './editor/TiptapEditor'

const LANGUAGES = ['ko', 'en'] as const
type Language = (typeof LANGUAGES)[number]

interface TranslationState {
  title: string
  summary: string
  // biome-ignore lint/suspicious/noExplicitAny: Tiptap JSON 문서
  contentJson: any
}

export interface PostEditorData {
  id: string
  slug: string
  status: 'draft' | 'published' | 'archived'
  tags: string[]
  layout: string | null
  date: string | null
  translations: Partial<
    Record<Language, { title: string; summary: string | null; contentJson: unknown }>
  >
}

const emptyTranslation = (): TranslationState => ({ title: '', summary: '', contentJson: null })

const STATUS_LABEL: Record<PostEditorData['status'], string> = {
  draft: '초안',
  published: '게시됨',
  archived: '아카이브',
}

export default function PostEditor({ initial }: { initial: PostEditorData }) {
  const router = useRouter()
  const [slug, setSlug] = useState(initial.slug)
  const [status, setStatus] = useState(initial.status)
  const [tags, setTags] = useState(initial.tags.join(', '))
  const [layout, setLayout] = useState(initial.layout ?? '')
  const [date, setDate] = useState(initial.date ? initial.date.slice(0, 10) : '')
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
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [preview, setPreview] = useState<{ code: string; lang: Language } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const updateTranslation = useCallback((lang: Language, patch: Partial<TranslationState>) => {
    setTranslations((prev) => ({ ...prev, [lang]: { ...prev[lang], ...patch } }))
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    setMessage(null)
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
          translations,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ kind: 'error', text: data.error || '저장에 실패했습니다' })
        return false
      }
      const failures = (data.compileResults ?? []).filter((r: { ok: boolean }) => !r.ok) as Array<{
        language: string
        error?: string
      }>
      if (failures.length > 0) {
        setMessage({
          kind: 'error',
          text: `저장은 되었지만 컴파일 실패: ${failures.map((f) => `[${f.language}] ${f.error}`).join(' / ')}`,
        })
        return false
      }
      setMessage({ kind: 'ok', text: '저장되었습니다' })
      return true
    } finally {
      setSaving(false)
    }
  }, [initial.id, slug, tags, layout, date, translations])

  // Cmd/Ctrl+S 저장
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [save])

  // Escape로 미리보기 닫기
  useEffect(() => {
    if (!preview) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [preview])

  const changeStatus = async (next: PostEditorData['status']) => {
    const saved = await save()
    if (!saved && next === 'published') return
    const res = await fetch(`/api/admin/posts/${initial.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage({
        kind: 'error',
        text: data.problems ? data.problems.join(' / ') : data.error || '상태 변경 실패',
      })
      return
    }
    setStatus(next)
    setMessage({ kind: 'ok', text: `상태가 '${STATUS_LABEL[next]}'(으)로 변경되었습니다` })
  }

  const remove = async () => {
    if (!window.confirm('이 글을 완전히 삭제할까요? 되돌릴 수 없습니다.')) return
    const res = await fetch(`/api/admin/posts/${initial.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/admin')
      router.refresh()
    } else {
      const data = await res.json()
      setMessage({ kind: 'error', text: data.error || '삭제 실패' })
    }
  }

  const openPreview = async () => {
    setPreviewLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentJson: translations[activeLang].contentJson }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ kind: 'error', text: data.error || '미리보기 컴파일 실패' })
        return
      }
      setPreview({ code: data.code, lang: activeLang })
    } finally {
      setPreviewLoading(false)
    }
  }

  const current = translations[activeLang]

  return (
    <div className="space-y-6">
      {/* 상단 액션 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              status === 'published'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : status === 'archived'
                  ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
            }`}
          >
            {STATUS_LABEL[status]}
          </span>
          {message && (
            <span
              className={`text-sm ${message.kind === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {message.text}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openPreview}
            disabled={previewLoading}
            className="admin-btn"
          >
            {previewLoading ? '컴파일 중…' : '미리보기'}
          </button>
          <button type="button" onClick={save} disabled={saving} className="admin-btn">
            {saving ? '저장 중…' : '저장'}
          </button>
          {status !== 'published' && (
            <button
              type="button"
              onClick={() => changeStatus('published')}
              className="admin-btn-primary"
            >
              게시
            </button>
          )}
          {status === 'published' && (
            <button type="button" onClick={() => changeStatus('draft')} className="admin-btn">
              초안으로 되돌리기
            </button>
          )}
          {status !== 'archived' && (
            <button type="button" onClick={() => changeStatus('archived')} className="admin-btn">
              아카이브
            </button>
          )}
          {status === 'archived' && (
            <button type="button" onClick={() => changeStatus('draft')} className="admin-btn">
              아카이브 해제
            </button>
          )}
          <button
            type="button"
            onClick={remove}
            className="admin-btn border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            삭제
          </button>
        </div>
      </div>

      {/* 메타 폼 */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 p-4 sm:grid-cols-2 dark:border-gray-800">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Slug {status !== 'draft' && <span className="text-gray-400">(게시 후 변경 불가)</span>}
          </span>
          <input
            type="text"
            value={slug}
            disabled={status !== 'draft'}
            onChange={(e) => setSlug(e.target.value)}
            className="admin-input"
            placeholder="my-post-slug"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">태그 (콤마 구분)</span>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="admin-input"
            placeholder="nextjs, ai"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">게시일</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="admin-input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">레이아웃</span>
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
            className="admin-input"
          >
            <option value="">기본 (PostLayout)</option>
            <option value="PostLayout">PostLayout</option>
            <option value="PostSimple">PostSimple</option>
            <option value="PostBanner">PostBanner</option>
          </select>
        </label>
      </div>

      {/* 언어 탭 */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setActiveLang(lang)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeLang === lang
                ? 'border border-b-0 border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {lang === 'ko' ? '한국어' : 'English'}
            {!translations[lang].title.trim() && <span className="ml-1 text-amber-500">•</span>}
          </button>
        ))}
      </div>

      {/* 언어별 편집 영역 — 탭 전환 시 에디터 상태 유지를 위해 둘 다 렌더하고 숨김 */}
      {LANGUAGES.map((lang) => (
        <div key={lang} className={lang === activeLang ? 'space-y-4' : 'hidden'}>
          <input
            type="text"
            value={translations[lang].title}
            onChange={(e) => updateTranslation(lang, { title: e.target.value })}
            placeholder={lang === 'ko' ? '제목을 입력하세요' : 'Title'}
            className="w-full border-0 bg-transparent text-3xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-700"
          />
          <textarea
            value={translations[lang].summary}
            onChange={(e) => updateTranslation(lang, { summary: e.target.value })}
            placeholder={lang === 'ko' ? '요약 (선택)' : 'Summary (optional)'}
            rows={2}
            className="w-full resize-none border-0 bg-transparent text-base text-gray-600 placeholder:text-gray-300 focus:outline-none focus:ring-0 dark:text-gray-400 dark:placeholder:text-gray-700"
          />
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <TiptapEditor
              value={translations[lang].contentJson}
              onChange={(json) => updateTranslation(lang, { contentJson: json })}
              slug={slug}
            />
          </div>
        </div>
      ))}

      {/* 미리보기 모달 */}
      {preview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 sm:p-8">
          <button
            type="button"
            aria-label="미리보기 닫기"
            className="fixed inset-0 cursor-default"
            onClick={() => setPreview(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="글 미리보기"
            className="relative mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl sm:p-10 dark:bg-gray-950"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-500">
                미리보기 ({preview.lang === 'ko' ? '한국어' : 'English'})
              </h2>
              <button type="button" onClick={() => setPreview(null)} className="admin-btn">
                닫기
              </button>
            </div>
            <h1 className="mb-2 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              {translations[preview.lang].title}
            </h1>
            {translations[preview.lang].summary && (
              <p className="mb-8 text-gray-500 dark:text-gray-400">
                {translations[preview.lang].summary}
              </p>
            )}
            <div className="prose dark:prose-invert max-w-none">
              <MDXLayoutRenderer code={preview.code} components={components} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
