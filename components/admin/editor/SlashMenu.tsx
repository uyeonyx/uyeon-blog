'use client'

import { Icon } from '@iconify/react'
import type { Editor, Range } from '@tiptap/core'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { cn } from '@/lib/utils'

export interface SlashItem {
  title: string
  description: string
  icon: string
  keywords: string[]
  command: (props: { editor: Editor; range: Range }) => void
}

export interface SlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean
}

interface SlashMenuProps {
  items: SlashItem[]
  command: (item: SlashItem) => void
}

const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: 아이템이 바뀌면 선택 초기화
  useEffect(() => setSelectedIndex(0), [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        if (items[selectedIndex]) command(items[selectedIndex])
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="slash-menu">
        <div className="px-3 py-2 text-sm text-gray-400">결과 없음</div>
      </div>
    )
  }

  return (
    <div className="slash-menu">
      {items.map((item, index) => {
        const selected = index === selectedIndex
        return (
          <button
            type="button"
            key={item.title}
            onClick={() => command(item)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
              selected && 'bg-primary-500/10'
            )}
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100/80 dark:bg-gray-800/80',
                selected && 'bg-primary-500/10 dark:bg-primary-500/15'
              )}
            >
              <Icon
                icon={item.icon}
                className={cn(
                  'size-4 text-gray-500 dark:text-gray-400',
                  selected && 'text-primary-500 dark:text-primary-400'
                )}
              />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  'block truncate text-sm font-medium text-gray-900 dark:text-gray-100',
                  selected && 'text-primary-600 dark:text-primary-400'
                )}
              >
                {item.title}
              </span>
              <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                {item.description}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
})

SlashMenu.displayName = 'SlashMenu'
export default SlashMenu
