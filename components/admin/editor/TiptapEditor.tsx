'use client'

import 'katex/dist/katex.css'
import 'css/editor.css'

import { Icon } from '@iconify/react'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, ReactNodeViewRenderer, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { useMemo, useRef, useState } from 'react'
import { useAdminToast } from '@/components/admin/ui/toast'
import {
  Alert,
  BlockMath,
  BlogImage,
  CodeBlockWithTitle,
  InlineMath,
  starterKitConfigured,
  tableExtensions,
} from '@/lib/editor/extensions'
import { cn } from '@/lib/utils'
import CodeBlockView from './CodeBlockView'
import MathDialog, { type MathDialogState } from './MathDialog'
import { createSlashCommand } from './slash-command'
import { insertImageFromFile } from './upload'

interface TiptapEditorProps {
  // biome-ignore lint/suspicious/noExplicitAny: Tiptap JSON 문서
  value: any
  // biome-ignore lint/suspicious/noExplicitAny: Tiptap JSON 문서
  onChange: (json: any) => void
  slug?: string
  placeholder?: string
}

function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

function BubbleButton({
  active,
  label,
  icon,
  onClick,
}: {
  active?: boolean
  label: string
  icon: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn('bubble-menu-btn', active && 'is-active')}
    >
      <Icon icon={icon} className="size-4" />
    </button>
  )
}

export default function TiptapEditor({ value, onChange, slug, placeholder }: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { loading, update } = useAdminToast()
  const [mathDialog, setMathDialog] = useState<MathDialogState | null>(null)
  const mathDialogRef = useRef(setMathDialog)
  mathDialogRef.current = setMathDialog
  const [linkEditing, setLinkEditing] = useState(false)
  const [linkValue, setLinkValue] = useState('')

  const uploadWithToast = (files: File[], pos?: number) => {
    const ed = editorRef.current
    if (!ed) return
    for (const file of files) {
      const toastId = loading(`'${file.name}' 업로드 중…`)
      insertImageFromFile(ed, file, slug, pos)
        .then(() => update(toastId, 'success', '이미지가 삽입되었습니다'))
        .catch((e) =>
          update(toastId, 'error', e instanceof Error ? e.message : '이미지 업로드에 실패했습니다')
        )
    }
  }
  const uploadRef = useRef(uploadWithToast)
  uploadRef.current = uploadWithToast

  const extensions = useMemo(
    () => [
      starterKitConfigured,
      CodeBlockWithTitle.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView)
        },
      }),
      BlogImage.configure({ inline: false }),
      InlineMath.configure({
        onClick: (node, pos) => {
          mathDialogRef.current({ mode: 'edit', type: 'inline', latex: node.attrs.latex, pos })
        },
      }),
      BlockMath.configure({
        onClick: (node, pos) => {
          mathDialogRef.current({ mode: 'edit', type: 'block', latex: node.attrs.latex, pos })
        },
      }),
      Alert,
      ...tableExtensions,
      Placeholder.configure({
        placeholder: placeholder ?? "본문을 입력하세요. '/'로 블록을 추가할 수 있습니다.",
      }),
      createSlashCommand({
        onImagePick: () => fileInputRef.current?.click(),
        onMathPick: (type) => mathDialogRef.current({ mode: 'insert', type, latex: '' }),
      }),
    ],
    [placeholder]
  )

  const editor = useEditor({
    extensions,
    content: value ?? undefined,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-[24rem] focus:outline-none',
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter(isImageFile)
        if (files.length === 0) return false
        event.preventDefault()
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
        uploadRef.current(files, coords?.pos)
        return true
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter(isImageFile)
        if (files.length === 0) return false
        event.preventDefault()
        uploadRef.current(files)
        return true
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
  })

  const editorRef = useRef(editor)
  editorRef.current = editor

  const startLinkEditing = () => {
    if (!editor) return
    setLinkValue((editor.getAttributes('link').href as string) ?? '')
    setLinkEditing(true)
  }

  const applyLink = () => {
    if (!editor) return
    const url = linkValue.trim()
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    setLinkEditing(false)
  }

  const submitMath = (latex: string, state: MathDialogState) => {
    const ed = editorRef.current
    if (!ed) return
    if (state.mode === 'edit') {
      if (state.type === 'inline') {
        ed.commands.updateInlineMath({ latex, pos: state.pos })
      } else {
        ed.commands.updateBlockMath({ latex, pos: state.pos })
      }
    } else if (state.type === 'inline') {
      ed.chain().focus().insertInlineMath({ latex }).run()
    } else {
      ed.chain().focus().insertBlockMath({ latex }).run()
    }
    setMathDialog(null)
  }

  return (
    <div className="tiptap-editor">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          uploadRef.current(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: ed, state }) =>
            !state.selection.empty && !ed.isActive('codeBlock') && !ed.isActive('image')
          }
        >
          {linkEditing ? (
            <div className="bubble-menu">
              <input
                type="url"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applyLink()
                  }
                  if (e.key === 'Escape') {
                    setLinkEditing(false)
                    editor.chain().focus().run()
                  }
                }}
                placeholder="https://example.com"
                className="bubble-menu-input"
                // biome-ignore lint/a11y/noAutofocus: 링크 편집 진입 시 입력 포커스는 의도된 동작
                autoFocus
              />
              <BubbleButton label="적용" icon="solar:check-circle-bold" onClick={applyLink} />
              {editor.isActive('link') && (
                <BubbleButton
                  label="링크 제거"
                  icon="solar:link-broken-bold"
                  onClick={() => {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run()
                    setLinkEditing(false)
                  }}
                />
              )}
              <BubbleButton
                label="취소"
                icon="solar:close-circle-bold"
                onClick={() => setLinkEditing(false)}
              />
            </div>
          ) : (
            <div className="bubble-menu">
              <BubbleButton
                label="굵게"
                icon="solar:text-bold"
                active={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}
              />
              <BubbleButton
                label="기울임"
                icon="solar:text-italic"
                active={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              />
              <BubbleButton
                label="취소선"
                icon="solar:text-cross"
                active={editor.isActive('strike')}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              />
              <BubbleButton
                label="인라인 코드"
                icon="solar:code-bold"
                active={editor.isActive('code')}
                onClick={() => editor.chain().focus().toggleCode().run()}
              />
              <BubbleButton
                label="링크"
                icon="solar:link-bold"
                active={editor.isActive('link')}
                onClick={startLinkEditing}
              />
            </div>
          )}
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
      <MathDialog state={mathDialog} onSubmit={submitMath} onClose={() => setMathDialog(null)} />
    </div>
  )
}
