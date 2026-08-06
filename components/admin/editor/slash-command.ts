'use client'

import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import type { AlertVariant } from '@/lib/editor/extensions'
import SlashMenu, { type SlashItem, type SlashMenuHandle } from './SlashMenu'

const ALERT_LABELS: Record<AlertVariant, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
}

const ALERT_ICONS: Record<AlertVariant, string> = {
  note: 'solar:info-circle-bold',
  tip: 'solar:lightbulb-bold',
  important: 'solar:danger-circle-bold',
  warning: 'solar:shield-warning-bold',
  caution: 'solar:forbidden-circle-bold',
}

export interface SlashCommandOptions {
  onImagePick: () => void
  onMathPick: (type: 'inline' | 'block') => void
  onYoutubePick: () => void
}

function buildItems({ onImagePick, onMathPick, onYoutubePick }: SlashCommandOptions): SlashItem[] {
  const items: SlashItem[] = [
    ...([1, 2, 3] as const).map((level) => ({
      title: `제목 ${level}`,
      description: `H${level} 헤딩`,
      icon: 'solar:text-bold-square',
      keywords: [`h${level}`, 'heading', 'title', '제목'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode('heading', { level }).run(),
    })),
    {
      title: '글머리 목록',
      description: '순서 없는 목록',
      icon: 'solar:list-bold',
      keywords: ['bullet', 'list', 'ul', '목록'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: '번호 목록',
      description: '순서 있는 목록',
      icon: 'solar:sort-by-alphabet-bold',
      keywords: ['ordered', 'number', 'ol', '번호'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: '인용문',
      description: '블록 인용',
      icon: 'solar:chat-square-quote-bold',
      keywords: ['quote', 'blockquote', '인용'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: '코드 블록',
      description: '문법 강조 코드',
      icon: 'solar:code-square-bold',
      keywords: ['code', 'codeblock', '코드'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: '이미지',
      description: '이미지 업로드',
      icon: 'solar:gallery-bold',
      keywords: ['image', 'photo', 'picture', '이미지', '사진'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        onImagePick()
      },
    },
    {
      title: '유튜브',
      description: '유튜브 영상 임베드',
      icon: 'solar:videocamera-record-bold',
      keywords: ['youtube', 'video', 'embed', '유튜브', '영상', '비디오'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        onYoutubePick()
      },
    },
    {
      title: '표',
      description: '3×3 표 삽입',
      icon: 'solar:widget-bold',
      keywords: ['table', '표', '테이블'],
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      title: '구분선',
      description: '수평 구분선',
      icon: 'solar:scissors-bold',
      keywords: ['divider', 'hr', 'rule', '구분선'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      title: '수식 (블록)',
      description: 'KaTeX 블록 수식',
      icon: 'solar:calculator-bold',
      keywords: ['math', 'katex', 'latex', '수식'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        onMathPick('block')
      },
    },
    {
      title: '수식 (인라인)',
      description: 'KaTeX 인라인 수식',
      icon: 'solar:calculator-minimalistic-bold',
      keywords: ['math', 'inline', 'katex', 'latex', '수식'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        onMathPick('inline')
      },
    },
    ...(Object.keys(ALERT_LABELS) as AlertVariant[]).map((variant) => ({
      title: `Alert: ${ALERT_LABELS[variant]}`,
      description: `${ALERT_LABELS[variant]} 강조 블록`,
      icon: ALERT_ICONS[variant],
      keywords: ['alert', 'callout', variant, '알림'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).wrapIn('alert', { variant }).run()
      },
    })),
  ]
  return items
}

export function createSlashCommand(options: SlashCommandOptions) {
  const allItems = buildItems(options)

  return Extension.create({
    name: 'slashCommand',
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: '/',
          command: ({ editor, range, props }) => {
            ;(props as SlashItem).command({ editor, range })
          },
          items: ({ query }) => {
            const q = query.toLowerCase()
            return allItems.filter(
              (item) =>
                item.title.toLowerCase().includes(q) ||
                item.keywords.some((k) => k.toLowerCase().includes(q))
            )
          },
          render: () => {
            let renderer: ReactRenderer<SlashMenuHandle> | null = null
            let unmount: (() => void) | null = null

            return {
              onStart: (props) => {
                renderer = new ReactRenderer(SlashMenu, {
                  props: {
                    items: props.items,
                    command: (item: SlashItem) => props.command(item),
                  },
                  editor: props.editor,
                })
                if (props.mount) {
                  unmount = props.mount(renderer.element as HTMLElement)
                }
              },
              onUpdate: (props) => {
                renderer?.updateProps({
                  items: props.items,
                  command: (item: SlashItem) => props.command(item),
                })
              },
              onKeyDown: (props) => {
                if (props.event.key === 'Escape') {
                  unmount?.()
                  return true
                }
                return renderer?.ref?.onKeyDown(props.event) ?? false
              },
              onExit: () => {
                unmount?.()
                renderer?.destroy()
                renderer = null
                unmount = null
              },
            }
          },
        }),
      ]
    },
  })
}
