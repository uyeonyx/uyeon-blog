'use client'

import type { Editor, Range } from '@tiptap/core'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

export interface SlashItem {
  title: string
  description: string
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
      {items.map((item, index) => (
        <button
          type="button"
          key={item.title}
          onClick={() => command(item)}
          onMouseEnter={() => setSelectedIndex(index)}
          className={`flex w-full flex-col items-start rounded-md px-3 py-1.5 text-left ${
            index === selectedIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
          }`}
        >
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{item.description}</span>
        </button>
      ))}
    </div>
  )
})

SlashMenu.displayName = 'SlashMenu'
export default SlashMenu
