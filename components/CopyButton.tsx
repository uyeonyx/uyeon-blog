'use client'

import { Icon } from '@iconify/react'
import { useState } from 'react'

/** 임의 텍스트 복사 버튼 — Pre.tsx의 클립보드 + 체크 아이콘 패턴 */
export default function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/30 backdrop-blur-md transition-all duration-300 hover:bg-black/50 dark:bg-white/10 dark:hover:bg-white/20"
      aria-label={label}
    >
      <Icon
        icon={copied ? 'mdi:check' : 'mdi:content-copy'}
        className={`text-lg ${copied ? 'text-green-400' : 'text-white/90'}`}
      />
    </button>
  )
}
