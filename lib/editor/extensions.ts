// 에디터(클라이언트)와 직렬화/파싱(서버)이 공유하는 스키마 확장.
// UI 전용 확장(Placeholder, 이벤트 핸들러 등)은 클라이언트에서만 추가한다.
import { mergeAttributes, Node } from '@tiptap/core'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import Image from '@tiptap/extension-image'
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import Youtube from '@tiptap/extension-youtube'
import StarterKit from '@tiptap/starter-kit'
import { common, createLowlight } from 'lowlight'

export const lowlight = createLowlight(common)

export const ALERT_VARIANTS = ['note', 'tip', 'important', 'warning', 'caution'] as const
export type AlertVariant = (typeof ALERT_VARIANTS)[number]

/** GitHub alert (`> [!NOTE]` 등) — remark-github-blockquote-alert 대응 */
export const Alert = Node.create({
  name: 'alert',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  addAttributes() {
    return {
      variant: {
        default: 'note',
        parseHTML: (element) => element.getAttribute('data-alert') || 'note',
      },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-alert]' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-alert': node.attrs.variant,
        class: `editor-alert editor-alert-${node.attrs.variant}`,
      }),
      0,
    ]
  },
})

/** width/height를 보존하는 이미지 — Blob 업로드 시 치수를 함께 저장해 next/image로 직렬화 */
export const BlogImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('width')
          return value ? Number(value) : null
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('height')
          return value ? Number(value) : null
        },
      },
    }
  },
})

/** 코드 블록 + 타이틀 attr (```lang:title — pliny remarkCodeTitles 대응) */
export const CodeBlockWithTitle = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-title'),
        renderHTML: (attributes) => (attributes.title ? { 'data-title': attributes.title } : {}),
      },
    }
  },
}).configure({ lowlight, defaultLanguage: 'js' })

export const starterKitConfigured = StarterKit.configure({
  codeBlock: false,
  link: {
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: 'noopener noreferrer' },
  },
})

export { BlockMath, InlineMath }

export const tableExtensions = [
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
]

/** 유튜브 임베드 — 붙여넣기 자동 임베드 포함. 크기는 CSS로 반응형 처리 */
export const YoutubeEmbed = Youtube.configure({
  nocookie: true,
  controls: true,
  modestBranding: true,
  HTMLAttributes: { class: 'youtube-embed' },
})

export const baseExtensions = [
  starterKitConfigured,
  CodeBlockWithTitle,
  BlogImage.configure({ inline: false }),
  InlineMath,
  BlockMath,
  Alert,
  ...tableExtensions,
  YoutubeEmbed,
]
