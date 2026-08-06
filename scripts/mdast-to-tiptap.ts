// 마이그레이션용 mdast → Tiptap JSON 변환기 (best-effort).
// 기존 블로그 글에서 실제 사용된 문법(제목/문단/강조/코드/링크/이미지/목록/인용/표/수식/alert)을 다룬다.
// biome-ignore-all lint/suspicious/noExplicitAny: mdast/Tiptap JSON 트리는 동적 구조

interface TiptapNode {
  type: string
  attrs?: Record<string, any>
  content?: TiptapNode[]
  marks?: Array<{ type: string; attrs?: Record<string, any> }>
  text?: string
}

type Mark = { type: string; attrs?: Record<string, any> }

const ALERT_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/

function textNode(text: string, marks: Mark[]): TiptapNode | null {
  if (!text) return null
  const node: TiptapNode = { type: 'text', text }
  if (marks.length > 0) node.marks = marks
  return node
}

function convertInline(nodes: any[], marks: Mark[] = []): TiptapNode[] {
  const out: TiptapNode[] = []
  for (const node of nodes ?? []) {
    switch (node.type) {
      case 'text': {
        const t = textNode(node.value, marks)
        if (t) out.push(t)
        break
      }
      case 'strong':
        out.push(...convertInline(node.children, [...marks, { type: 'bold' }]))
        break
      case 'emphasis':
        out.push(...convertInline(node.children, [...marks, { type: 'italic' }]))
        break
      case 'delete':
        out.push(...convertInline(node.children, [...marks, { type: 'strike' }]))
        break
      case 'inlineCode': {
        const t = textNode(node.value, [...marks, { type: 'code' }])
        if (t) out.push(t)
        break
      }
      case 'link':
        out.push(
          ...convertInline(node.children, [...marks, { type: 'link', attrs: { href: node.url } }])
        )
        break
      case 'inlineMath':
        out.push({ type: 'inlineMath', attrs: { latex: node.value } })
        break
      case 'break':
        out.push({ type: 'hardBreak' })
        break
      case 'image':
        // 인라인 위치의 이미지는 블록 변환부에서 끌어올린다 — 여기 도달하면 텍스트로 대체
        out.push({
          type: 'text',
          text: node.alt || node.url,
          marks: marks.length ? marks : undefined,
        })
        break
      default: {
        if (node.children) out.push(...convertInline(node.children, marks))
        else if (typeof node.value === 'string') {
          const t = textNode(node.value, marks)
          if (t) out.push(t)
        }
      }
    }
  }
  return out
}

function paragraphOf(children: any[]): TiptapNode {
  return { type: 'paragraph', content: convertInline(children) }
}

function convertBlock(node: any): TiptapNode[] {
  switch (node.type) {
    case 'heading':
      return [
        { type: 'heading', attrs: { level: node.depth }, content: convertInline(node.children) },
      ]
    case 'paragraph': {
      // 문단이 이미지 하나만 담고 있으면 블록 이미지로 승격
      const images = (node.children ?? []).filter((c: any) => c.type === 'image')
      const nonImage = (node.children ?? []).filter(
        (c: any) => !(c.type === 'image' || (c.type === 'text' && !c.value.trim()))
      )
      if (images.length > 0 && nonImage.length === 0) {
        return images.map((img: any) => ({
          type: 'image',
          attrs: { src: img.url, alt: img.alt ?? '', width: null, height: null },
        }))
      }
      return [paragraphOf(node.children)]
    }
    case 'blockquote': {
      // GitHub alert 감지: 첫 문단이 [!NOTE] 등으로 시작
      const children = [...(node.children ?? [])]
      const first = children[0]
      const firstText = first?.type === 'paragraph' ? first.children?.[0] : null
      if (firstText?.type === 'text') {
        const match = firstText.value.match(ALERT_RE)
        if (match) {
          const variant = match[1].toLowerCase()
          firstText.value = firstText.value.replace(ALERT_RE, '').replace(/^\n/, '')
          const paragraphs = children
            .flatMap((c: any) =>
              c.type === 'paragraph' ? [paragraphOf(c.children)] : convertBlock(c)
            )
            .filter((p) => p.type === 'paragraph')
          return [
            {
              type: 'alert',
              attrs: { variant },
              content: paragraphs.length > 0 ? paragraphs : [{ type: 'paragraph', content: [] }],
            },
          ]
        }
      }
      return [{ type: 'blockquote', content: children.flatMap(convertBlock) }]
    }
    case 'code': {
      const meta = typeof node.meta === 'string' ? node.meta : null
      // ```lang:title 형식 — remark는 lang에 "ts:title"을 통째로 넣는다
      let language = node.lang || null
      let title: string | null = null
      if (language?.includes(':')) {
        const idx = language.indexOf(':')
        title = language.slice(idx + 1) || null
        language = language.slice(0, idx)
      } else if (meta) {
        title = meta
      }
      return [
        {
          type: 'codeBlock',
          attrs: { language: language || 'text', title },
          content: node.value ? [{ type: 'text', text: node.value }] : [],
        },
      ]
    }
    case 'list': {
      const items = (node.children ?? []).map((item: any) => ({
        type: 'listItem',
        content: (item.children ?? []).flatMap(convertBlock),
      }))
      if (node.ordered) {
        return [{ type: 'orderedList', attrs: { start: node.start ?? 1 }, content: items }]
      }
      return [{ type: 'bulletList', content: items }]
    }
    case 'thematicBreak':
      return [{ type: 'horizontalRule' }]
    case 'math':
      return [{ type: 'blockMath', attrs: { latex: node.value } }]
    case 'table': {
      const rows = (node.children ?? []).map((row: any, rowIndex: number) => ({
        type: 'tableRow',
        content: (row.children ?? []).map((cell: any) => ({
          type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
          content: [paragraphOf(cell.children)],
        })),
      }))
      return [{ type: 'table', content: rows }]
    }
    case 'html':
      // 사용되지 않는 케이스 — 원문 보존을 위해 코드 블록으로
      return [
        {
          type: 'codeBlock',
          attrs: { language: 'html', title: null },
          content: [{ type: 'text', text: node.value }],
        },
      ]
    default:
      if (node.children) return node.children.flatMap(convertBlock)
      return []
  }
}

// biome-ignore lint/suspicious/noExplicitAny: mdast 루트
export function mdastToTiptap(root: any): TiptapNode {
  const content = (root.children ?? []).flatMap(convertBlock)
  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  }
}
