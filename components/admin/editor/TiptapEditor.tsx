'use client'

import 'katex/dist/katex.css'
import 'css/editor.css'

import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, ReactNodeViewRenderer, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { useMemo, useRef } from 'react'
import {
  Alert,
  BlockMath,
  BlogImage,
  CodeBlockWithTitle,
  InlineMath,
  starterKitConfigured,
  tableExtensions,
} from '@/lib/editor/extensions'
import CodeBlockView from './CodeBlockView'
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

export default function TiptapEditor({ value, onChange, slug, placeholder }: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          const latex = window.prompt('LaTeX 수식 수정', node.attrs.latex)
          if (latex !== null) {
            editorRef.current?.commands.updateInlineMath({ latex, pos })
          }
        },
      }),
      BlockMath.configure({
        onClick: (node, pos) => {
          const latex = window.prompt('LaTeX 수식 수정', node.attrs.latex)
          if (latex !== null) {
            editorRef.current?.commands.updateBlockMath({ latex, pos })
          }
        },
      }),
      Alert,
      ...tableExtensions,
      Placeholder.configure({
        placeholder: placeholder ?? "본문을 입력하세요. '/'로 블록을 추가할 수 있습니다.",
      }),
      createSlashCommand({ onImagePick: () => fileInputRef.current?.click() }),
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
        const ed = editorRef.current
        if (ed) {
          for (const file of files) {
            insertImageFromFile(ed, file, slug, coords?.pos).catch((e) =>
              window.alert(e instanceof Error ? e.message : '업로드 실패')
            )
          }
        }
        return true
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter(isImageFile)
        if (files.length === 0) return false
        event.preventDefault()
        const ed = editorRef.current
        if (ed) {
          for (const file of files) {
            insertImageFromFile(ed, file, slug).catch((e) =>
              window.alert(e instanceof Error ? e.message : '업로드 실패')
            )
          }
        }
        return true
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
  })

  const editorRef = useRef(editor)
  editorRef.current = editor

  const setLink = () => {
    if (!editor) return
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('링크 URL', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
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
          const files = Array.from(e.target.files ?? [])
          const ed = editorRef.current
          if (ed) {
            for (const file of files) {
              insertImageFromFile(ed, file, slug).catch((err) =>
                window.alert(err instanceof Error ? err.message : '업로드 실패')
              )
            }
          }
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
          <div className="bubble-menu">
            <button
              type="button"
              className={editor.isActive('bold') ? 'is-active' : ''}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              B
            </button>
            <button
              type="button"
              className={`italic ${editor.isActive('italic') ? 'is-active' : ''}`}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              I
            </button>
            <button
              type="button"
              className={`line-through ${editor.isActive('strike') ? 'is-active' : ''}`}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              S
            </button>
            <button
              type="button"
              className={`font-mono ${editor.isActive('code') ? 'is-active' : ''}`}
              onClick={() => editor.chain().focus().toggleCode().run()}
            >
              {'<>'}
            </button>
            <button
              type="button"
              className={editor.isActive('link') ? 'is-active' : ''}
              onClick={setLink}
            >
              링크
            </button>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
