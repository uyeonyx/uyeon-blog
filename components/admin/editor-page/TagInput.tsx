'use client'

import { Icon } from '@iconify/react'
import { slug as slugify } from 'github-slugger'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface TagOption {
  slug: string
  labelKo: string
  labelEn: string
  postCount: number
  projectCount: number
  registered: boolean
}

interface TagInputProps {
  /** 선택된 태그 — 기존 태그는 canonical slug, 새로 입력한 태그는 원본 문자열(저장 시 서버가 정규화·등록) */
  value: string[]
  onChange: (v: string[]) => void
  inputId?: string
}

const inputBoxClass =
  'w-full rounded-lg border border-gray-200/80 dark:border-gray-700/80 bg-white/50 dark:bg-gray-900/50 backdrop-blur px-2 py-1.5 text-sm transition-colors focus-within:border-primary-500/60 focus-within:ring-2 focus-within:ring-primary-500/20'

export default function TagInput({ value, onChange, inputId }: TagInputProps) {
  const [options, setOptions] = useState<TagOption[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/tags')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.items) setOptions(data.items)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const bySlug = useMemo(() => new Map(options.map((o) => [o.slug, o])), [options])
  const selectedSlugs = useMemo(() => new Set(value.map((v) => slugify(v.trim()))), [value])

  const trimmedQuery = query.trim()
  const querySlug = slugify(trimmedQuery)

  const suggestions = useMemo(() => {
    const q = trimmedQuery.toLowerCase()
    return options
      .filter((o) => !selectedSlugs.has(o.slug))
      .filter(
        (o) =>
          !q ||
          o.slug.includes(querySlug || q) ||
          o.labelKo.toLowerCase().includes(q) ||
          o.labelEn.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [options, selectedSlugs, trimmedQuery, querySlug])

  // 새 태그 항목 — 입력값이 기존 태그와 정확히 일치하면 숨김
  const canCreate = !!querySlug && !bySlug.has(querySlug) && !selectedSlugs.has(querySlug)
  const listLength = suggestions.length + (canCreate ? 1 : 0)

  const addTag = (raw: string) => {
    const s = slugify(raw.trim())
    if (!s || selectedSlugs.has(s)) return
    onChange([...value, raw.trim()])
    setQuery('')
    setHighlight(0)
  }

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const commitHighlighted = () => {
    if (highlight < suggestions.length) addTag(suggestions[highlight].slug)
    else if (canCreate) addTag(trimmedQuery)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, listLength - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' || e.key === ',') {
      if (trimmedQuery || (open && listLength > 0)) {
        e.preventDefault()
        if (open && listLength > 0) commitHighlighted()
        else if (trimmedQuery) addTag(trimmedQuery)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      removeAt(value.length - 1)
    }
  }

  const chipLabel = (raw: string) => {
    const option = bySlug.get(slugify(raw.trim()))
    return option ? option.labelKo : raw
  }

  return (
    <div ref={rootRef} className="relative">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: 인풋으로 포커스를 넘기는 래퍼 */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: 키보드는 내부 input이 직접 받는다 */}
      <div
        className={cn(inputBoxClass, 'flex flex-wrap items-center gap-1.5')}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((raw, i) => (
          <span
            key={raw}
            className="inline-flex items-center gap-1 rounded-full bg-primary-500/10 px-2.5 py-1 text-xs font-medium text-primary-600 dark:text-primary-400"
          >
            {chipLabel(raw)}
            <button
              type="button"
              aria-label={`${chipLabel(raw)} 태그 제거`}
              onClick={() => removeAt(i)}
              className="rounded-full transition-colors hover:text-red-500"
            >
              <Icon icon="solar:close-circle-bold" className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={value.length === 0 ? '태그 검색 또는 새로 입력' : ''}
          className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-600"
        />
      </div>

      {open && listLength > 0 && (
        <ul className="absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200/80 bg-white/95 py-1 shadow-xl shadow-gray-900/10 backdrop-blur-xl dark:border-gray-700/80 dark:bg-gray-900/95">
          {suggestions.map((o, i) => (
            <li key={o.slug}>
              <button
                type="button"
                onClick={() => addTag(o.slug)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200',
                  highlight === i && 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                )}
              >
                <span className="font-medium">{o.labelKo}</span>
                {o.labelEn !== o.labelKo && (
                  <span className="text-xs text-gray-400">{o.labelEn}</span>
                )}
                <span className="text-xs text-gray-400">({o.slug})</span>
                <span className="ml-auto text-xs text-gray-400">
                  글 {o.postCount}
                  {o.projectCount > 0 && ` · 프로젝트 ${o.projectCount}`}
                </span>
              </button>
            </li>
          ))}
          {canCreate && (
            <li>
              <button
                type="button"
                onClick={() => addTag(trimmedQuery)}
                onMouseEnter={() => setHighlight(suggestions.length)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200',
                  highlight === suggestions.length &&
                    'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                )}
              >
                <Icon icon="solar:add-circle-bold" className="size-4 shrink-0" />
                <span>
                  &ldquo;{trimmedQuery}&rdquo; 새 태그 만들기
                  <span className="ml-1.5 text-xs text-gray-400">→ {querySlug}</span>
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
