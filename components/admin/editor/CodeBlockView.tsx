'use client'

import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import { useMemo } from 'react'
import { lowlight } from '@/lib/editor/extensions'

export default function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const languages = useMemo(() => lowlight.listLanguages().sort(), [])

  return (
    <NodeViewWrapper className="code-block-view">
      <div contentEditable={false} className="code-block-toolbar">
        <select
          value={node.attrs.language || 'js'}
          onChange={(e) => updateAttributes({ language: e.target.value })}
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="파일명 (선택)"
          value={node.attrs.title || ''}
          onChange={(e) => updateAttributes({ title: e.target.value || null })}
        />
      </div>
      <pre>
        <NodeViewContent<'code'> as="code" />
      </pre>
    </NodeViewWrapper>
  )
}
