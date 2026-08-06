'use client'

import 'css/prism.css'
import 'katex/dist/katex.css'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDirtyGuard } from './DirtyGuard'
import TiptapEditor from './editor/TiptapEditor'
import { uploadImageFile } from './editor/upload'
import type { Language } from './editor-page/LanguageTabs'
import LanguageTabs from './editor-page/LanguageTabs'
import { AdminButton, AdminInput, AdminTextarea, GlassCard } from './ui/primitives'
import { useAdminToast } from './ui/toast'

const LANGUAGES: Language[] = ['ko', 'en']

interface TranslationState {
  name: string
  occupation: string
  company: string
  techStackText: string
  timelineText: string
  // biome-ignore lint/suspicious/noExplicitAny: Tiptap JSON 문서
  contentJson: any
}

export interface AboutEditorData {
  id: string
  avatarUrl: string | null
  email: string | null
  github: string | null
  linkedin: string | null
  twitter: string | null
  bluesky: string | null
  translations: Partial<
    Record<
      Language,
      {
        name: string
        occupation: string | null
        company: string | null
        techStack: unknown
        timeline: unknown
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

function toJsonText(value: unknown): string {
  if (!value) return '[]'
  return JSON.stringify(value, null, 2)
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {children}
    </div>
  )
}

export default function AboutEditor({ initial }: { initial: AboutEditorData }) {
  const { toast } = useAdminToast()
  const { setDirty } = useDirtyGuard()

  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? '')
  const [email, setEmail] = useState(initial.email ?? '')
  const [github, setGithub] = useState(initial.github ?? '')
  const [linkedin, setLinkedin] = useState(initial.linkedin ?? '')
  const [twitter, setTwitter] = useState(initial.twitter ?? '')
  const [bluesky, setBluesky] = useState(initial.bluesky ?? '')
  const [activeLang, setActiveLang] = useState<Language>('ko')
  const [translations, setTranslations] = useState<Record<Language, TranslationState>>({
    ko: {
      name: initial.translations.ko?.name ?? '',
      occupation: initial.translations.ko?.occupation ?? '',
      company: initial.translations.ko?.company ?? '',
      techStackText: toJsonText(initial.translations.ko?.techStack),
      timelineText: toJsonText(initial.translations.ko?.timeline),
      contentJson: initial.translations.ko?.contentJson ?? null,
    },
    en: {
      name: initial.translations.en?.name ?? '',
      occupation: initial.translations.en?.occupation ?? '',
      company: initial.translations.en?.company ?? '',
      techStackText: toJsonText(initial.translations.en?.techStack),
      timelineText: toJsonText(initial.translations.en?.timeline),
      contentJson: initial.translations.en?.contentJson ?? null,
    },
  })
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const snapshot = useMemo(
    () => JSON.stringify({ avatarUrl, email, github, linkedin, twitter, bluesky, translations }),
    [avatarUrl, email, github, linkedin, twitter, bluesky, translations]
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

    // JSON textarea 파싱 검증
    const parsed: Partial<Record<Language, { techStack: unknown; timeline: unknown }>> = {}
    for (const lang of LANGUAGES) {
      try {
        parsed[lang] = {
          techStack: JSON.parse(translations[lang].techStackText || '[]'),
          timeline: JSON.parse(translations[lang].timelineText || '[]'),
        }
      } catch (e) {
        toast('error', `[${lang}] JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)}`)
        return false
      }
    }

    savingRef.current = true
    setSaving(true)
    const currentSnapshot = JSON.stringify({
      avatarUrl,
      email,
      github,
      linkedin,
      twitter,
      bluesky,
      translations,
    })
    try {
      const res = await fetch('/api/admin/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarUrl,
          email,
          github,
          linkedin,
          twitter,
          bluesky,
          translations: Object.fromEntries(
            LANGUAGES.map((lang) => [
              lang,
              {
                name: translations[lang].name,
                occupation: translations[lang].occupation,
                company: translations[lang].company,
                techStack: parsed[lang]?.techStack,
                timeline: parsed[lang]?.timeline,
                contentJson: translations[lang].contentJson,
              },
            ])
          ),
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
  }, [avatarUrl, email, github, linkedin, twitter, bluesky, translations, toast])

  const saveRef = useRef(save)
  saveRef.current = save

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

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true)
    try {
      const uploaded = await uploadImageFile(file, 'avatar', 'about')
      setAvatarUrl(uploaded.url)
      toast('success', '아바타가 업로드되었습니다. 저장을 눌러 반영하세요')
    } catch (e) {
      toast('error', e instanceof Error ? e.message : '업로드에 실패했습니다')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* 액션 바 */}
      <motion.div variants={item} className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          소개 페이지 편집
        </h1>
        {isDirty && (
          <span className="text-xs text-amber-600 dark:text-amber-400">저장되지 않은 변경</span>
        )}
        <div className="ml-auto">
          <AdminButton variant="primary" onClick={() => save()} disabled={saving || !isDirty}>
            <Icon
              icon={saving ? 'solar:refresh-bold' : 'solar:diskette-bold'}
              className={`size-4 ${saving ? 'animate-spin' : ''}`}
            />
            저장
          </AdminButton>
        </div>
      </motion.div>

      {/* 공통 메타: 아바타 + 소셜 */}
      <motion.div variants={item}>
        <GlassCard innerClassName="p-5">
          <div className="mb-4 flex items-center gap-4">
            {avatarUrl && (
              // biome-ignore lint/performance/noImgElement: 미리보기 용도
              <img
                src={avatarUrl}
                alt="아바타 미리보기"
                className="h-16 w-16 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
              />
            )}
            <div>
              <AdminButton
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Icon
                  icon={uploadingAvatar ? 'solar:refresh-bold' : 'solar:camera-bold'}
                  className={`size-4 ${uploadingAvatar ? 'animate-spin' : ''}`}
                />
                아바타 변경
              </AdminButton>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadAvatar(file)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetaField label="이메일">
              <AdminInput value={email} onChange={(e) => setEmail(e.target.value)} />
            </MetaField>
            <MetaField label="GitHub URL">
              <AdminInput value={github} onChange={(e) => setGithub(e.target.value)} />
            </MetaField>
            <MetaField label="LinkedIn URL">
              <AdminInput value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
            </MetaField>
            <MetaField label="X (Twitter) URL">
              <AdminInput value={twitter} onChange={(e) => setTwitter(e.target.value)} />
            </MetaField>
            <MetaField label="Bluesky URL">
              <AdminInput value={bluesky} onChange={(e) => setBluesky(e.target.value)} />
            </MetaField>
          </div>
        </GlassCard>
      </motion.div>

      {/* 언어별 편집 */}
      <motion.div variants={item} className="space-y-4">
        <LanguageTabs
          activeLang={activeLang}
          setActiveLang={setActiveLang}
          completeness={{
            ko: !!translations.ko.name.trim(),
            en: !!translations.en.name.trim(),
          }}
        />

        {LANGUAGES.map((lang) => (
          <div key={lang} className={lang === activeLang ? 'space-y-4' : 'hidden'}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetaField label={lang === 'ko' ? '이름' : 'Name'}>
                <AdminInput
                  value={translations[lang].name}
                  onChange={(e) => updateTranslation(lang, { name: e.target.value })}
                />
              </MetaField>
              <MetaField label={lang === 'ko' ? '직함' : 'Occupation'}>
                <AdminInput
                  value={translations[lang].occupation}
                  onChange={(e) => updateTranslation(lang, { occupation: e.target.value })}
                />
              </MetaField>
              <MetaField label={lang === 'ko' ? '소속' : 'Company'}>
                <AdminInput
                  value={translations[lang].company}
                  onChange={(e) => updateTranslation(lang, { company: e.target.value })}
                />
              </MetaField>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                {lang === 'ko' ? '소개글 (Philosophy 카드 내용)' : 'Intro (Philosophy card)'}
              </p>
              <div className="relative rounded-2xl border border-white/60 bg-white/70 shadow-xl shadow-gray-900/10 backdrop-blur-xl before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:border-gray-700/80 dark:bg-gray-900/70 dark:shadow-primary-500/10 dark:before:from-white/5">
                <div className="relative p-5">
                  <TiptapEditor
                    value={translations[lang].contentJson}
                    onChange={(json) => updateTranslation(lang, { contentJson: json })}
                    slug="intro"
                    scope="about"
                    placeholder={lang === 'ko' ? '자기소개를 입력하세요…' : 'Introduce yourself…'}
                  />
                </div>
              </div>
            </div>

            <MetaField label="Tech Stack (JSON — [{title, techs: [{name, items: []}]}])">
              <AdminTextarea
                value={translations[lang].techStackText}
                onChange={(e) => updateTranslation(lang, { techStackText: e.target.value })}
                rows={12}
                className="font-mono text-xs"
              />
            </MetaField>

            <MetaField label="Timeline (JSON — [{period, title, company, description, link?}])">
              <AdminTextarea
                value={translations[lang].timelineText}
                onChange={(e) => updateTranslation(lang, { timelineText: e.target.value })}
                rows={12}
                className="font-mono text-xs"
              />
            </MetaField>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}
