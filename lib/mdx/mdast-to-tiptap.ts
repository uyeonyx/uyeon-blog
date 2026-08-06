// mdast → Tiptap JSON 변환기 (best-effort).
// 블로그에서 실제 사용되는 문법(제목/문단/강조/코드/링크/이미지/목록/인용/표/수식/alert)과
// serialize.ts가 출력하는 JSX(<Image/>, <YouTube/>, <u>, <br/>)를 왕복 가능하게 다룬다.
// remark-mdx 파서와 함께 사용해야 JSX가 mdxJsxFlowElement/mdxJsxTextElement로 파싱된다.
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

// 변환은 동기 단일 스레드로 실행되므로 모듈 스코프 수집기로 충분하다
let warnings: string[] = []

function textNode(text: string, marks: Mark[]): TiptapNode | null {
  if (!text) return null
  const node: TiptapNode = { type: 'text', text }
  if (marks.length > 0) node.marks = marks
  return node
}

/** mdxJsxAttribute 배열 → {이름: 값}. width={640} 같은 표현식은 숫자로 변환 시도 */
function jsxAttrsOf(node: any): Record<string, any> {
  const out: Record<string, any> = {}
  for (const attr of node.attributes ?? []) {
    if (attr.type !== 'mdxJsxAttribute') continue
    const v = attr.value
    if (v == null) out[attr.name] = true
    else if (typeof v === 'string') out[attr.name] = v
    else if (v.type === 'mdxJsxAttributeValueExpression') {
      const num = Number(v.value)
      out[attr.name] = Number.isNaN(num) ? v.value : num
    }
  }
  return out
}

function imageNodeFromJsx(node: any): TiptapNode {
  const attrs = jsxAttrsOf(node)
  return {
    type: 'image',
    attrs: {
      src: String(attrs.src ?? ''),
      alt: String(attrs.alt ?? ''),
      width: typeof attrs.width === 'number' ? attrs.width : null,
      height: typeof attrs.height === 'number' ? attrs.height : null,
    },
  }
}

function youtubeNodeFromJsx(node: any): TiptapNode | null {
  const attrs = jsxAttrsOf(node)
  const id = String(attrs.id ?? '')
  if (!id) return null
  return {
    type: 'youtube',
    attrs: { src: `https://www.youtube.com/watch?v=${id}` },
  }
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
      case 'mdxJsxTextElement': {
        // serialize.ts가 출력하는 인라인 JSX: <u>…</u>, <br /> (표 셀 줄바꿈)
        if (node.name === 'u') {
          out.push(...convertInline(node.children, [...marks, { type: 'underline' }]))
        } else if (node.name === 'br') {
          out.push({ type: 'hardBreak' })
        } else if (node.name === 'Image') {
          // 인라인 위치의 Image JSX — 블록 변환부에서 승격되므로 여기서는 드묾
          out.push(imageNodeFromJsx(node))
        } else {
          warnings.push(`지원하지 않는 인라인 JSX <${node.name}> — 내부 텍스트만 유지됩니다`)
          out.push(...convertInline(node.children, marks))
        }
        break
      }
      case 'mdxTextExpression':
        warnings.push(`인라인 표현식 {${node.value}} 은 지원되지 않아 제거됩니다`)
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
      // 문단이 이미지(마크다운 또는 <Image/> JSX) 하나만 담고 있으면 블록 이미지로 승격
      const isImg = (c: any) =>
        c.type === 'image' || (c.type === 'mdxJsxTextElement' && c.name === 'Image')
      const images = (node.children ?? []).filter(isImg)
      const nonImage = (node.children ?? []).filter(
        (c: any) => !(isImg(c) || (c.type === 'text' && !c.value.trim()))
      )
      if (images.length > 0 && nonImage.length === 0) {
        return images.map((img: any) =>
          img.type === 'image'
            ? {
                type: 'image',
                attrs: { src: img.url, alt: img.alt ?? '', width: null, height: null },
              }
            : imageNodeFromJsx(img)
        )
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
      // 셀 내 <br />는 serialize.ts가 문단 사이 구분자로 출력하는 것과 대칭으로 문단 분리로 복원
      const splitCellParagraphs = (children: any[]): TiptapNode[] => {
        const groups: any[][] = [[]]
        for (const c of children ?? []) {
          if (c.type === 'mdxJsxTextElement' && c.name === 'br') groups.push([])
          else groups[groups.length - 1].push(c)
        }
        return groups.map((g) => paragraphOf(g))
      }
      const rows = (node.children ?? []).map((row: any, rowIndex: number) => ({
        type: 'tableRow',
        content: (row.children ?? []).map((cell: any) => ({
          type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
          content: splitCellParagraphs(cell.children),
        })),
      }))
      return [{ type: 'table', content: rows }]
    }
    case 'mdxJsxFlowElement': {
      // serialize.ts가 출력하는 블록 JSX: <Image …/>, <YouTube id="…"/>
      if (node.name === 'Image') return [imageNodeFromJsx(node)]
      if (node.name === 'YouTube') {
        const yt = youtubeNodeFromJsx(node)
        if (yt) return [yt]
        warnings.push('<YouTube>에 id 속성이 없어 제거됩니다')
        return []
      }
      warnings.push(`지원하지 않는 JSX 컴포넌트 <${node.name}> — 내부 콘텐츠만 유지됩니다`)
      return (node.children ?? []).flatMap(convertBlock)
    }
    case 'mdxFlowExpression':
      warnings.push(`블록 표현식 {${node.value}} 은 지원되지 않아 제거됩니다`)
      return []
    case 'mdxjsEsm':
      warnings.push('import/export 구문은 지원되지 않아 제거됩니다')
      return []
    case 'html':
      // remark-mdx 미사용 파싱 경로의 원문 HTML — 보존을 위해 코드 블록으로
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

export interface MdastToTiptapResult {
  doc: TiptapNode
  warnings: string[]
}

// biome-ignore lint/suspicious/noExplicitAny: mdast 루트
export function mdastToTiptap(root: any): TiptapNode {
  return mdastToTiptapWithWarnings(root).doc
}

/** 변환 + 손실 가능성 경고 목록 반환 (MCP 도구용) */
// biome-ignore lint/suspicious/noExplicitAny: mdast 루트
export function mdastToTiptapWithWarnings(root: any): MdastToTiptapResult {
  warnings = []
  const content = (root.children ?? []).flatMap(convertBlock)
  const doc: TiptapNode = {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  }
  return { doc, warnings }
}
