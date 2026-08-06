'use client'

export type Language = 'ko' | 'en'

interface LanguageTabsProps {
  activeLang: Language
  setActiveLang: (lang: Language) => void
  /** 언어별 제목 입력 여부 — 미완성 표시용 */
  completeness: Record<Language, boolean>
}

const LANGUAGES: Array<{ key: Language; label: string }> = [
  { key: 'ko', label: '한국어' },
  { key: 'en', label: 'English' },
]

export default function LanguageTabs({
  activeLang,
  setActiveLang,
  completeness,
}: LanguageTabsProps) {
  return (
    <div className="inline-flex rounded-full bg-gray-100/70 p-1 backdrop-blur dark:bg-gray-800/70">
      {LANGUAGES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setActiveLang(key)}
          className={
            activeLang === key
              ? 'flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-primary-600 shadow-sm dark:bg-gray-900 dark:text-primary-400'
              : 'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          }
        >
          {label}
          {!completeness[key] && (
            <span className="size-1.5 rounded-full bg-amber-500" title="제목이 비어 있습니다" />
          )}
        </button>
      ))}
    </div>
  )
}
