// Tiptap(ProseMirror) 문서 JSON → MDX 직렬화. content_json이 편집 원본이고 이 출력은 컴파일 입력.
import { getSchema } from '@tiptap/core'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { MarkdownSerializer, type MarkdownSerializerState } from 'prosemirror-markdown'
import { baseExtensions } from '../editor/extensions'
import { extractYoutubeId } from '../youtube'

const schema = getSchema(baseExtensions)

// prosemirror-markdown 기본 code 마크의 백틱 처리 로직
function backticksFor(node: ProseMirrorNode, side: number) {
  const ticks = /`+/g
  let len = 0
  if (node.isText && node.text) {
    let m = ticks.exec(node.text)
    while (m) {
      len = Math.max(len, m[0].length)
      m = ticks.exec(node.text)
    }
  }
  let result = len > 0 && side > 0 ? ' `' : '`'
  result += '`'.repeat(len)
  if (len > 0 && side < 0) result += ' '
  return result
}

// JSX 속성 문자열 — backslash 이스케이프는 MDX가 지원하지 않으므로 HTML 엔티티 사용
function jsxAttr(value: string) {
  const escaped = String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
  return `"${escaped}"`
}

const serializer = new MarkdownSerializer(
  {
    text(state, node) {
      state.text(node.text ?? '')
    },
    paragraph(state, node) {
      state.renderInline(node)
      state.closeBlock(node)
    },
    heading(state, node) {
      state.write(`${'#'.repeat(node.attrs.level)} `)
      state.renderInline(node, false)
      state.closeBlock(node)
    },
    blockquote(state, node) {
      state.wrapBlock('> ', null, node, () => state.renderContent(node))
    },
    alert(state, node) {
      state.write(`> [!${String(node.attrs.variant).toUpperCase()}]`)
      state.ensureNewLine()
      state.wrapBlock('> ', null, node, () => state.renderContent(node))
    },
    codeBlock(state, node) {
      const language = node.attrs.language || ''
      const title = node.attrs.title ? `:${node.attrs.title}` : ''
      const backticks = node.textContent.match(/`{3,}/gm)
      const fence = backticks ? `${backticks.sort().slice(-1)[0]}\`` : '```'
      state.write(`${fence}${language}${title}\n`)
      state.text(node.textContent, false)
      state.write('\n')
      state.write(fence)
      state.closeBlock(node)
    },
    bulletList(state, node) {
      state.renderList(node, '  ', () => '- ')
    },
    orderedList(state, node) {
      const start = node.attrs.start || 1
      const maxWidth = String(start + node.childCount - 1).length
      const space = state.repeat(' ', maxWidth + 2)
      state.renderList(node, space, (i) => {
        const nStr = String(start + i)
        return `${state.repeat(' ', maxWidth - nStr.length)}${nStr}. `
      })
    },
    listItem(state, node) {
      state.renderContent(node)
    },
    horizontalRule(state, node) {
      state.write('---')
      state.closeBlock(node)
    },
    hardBreak(state, node, parent, index) {
      for (let i = index + 1; i < parent.childCount; i++) {
        if (parent.child(i).type !== node.type) {
          state.write('\\\n')
          return
        }
      }
    },
    image(state, node) {
      const { src, alt, width, height } = node.attrs
      if (width && height) {
        // 원격(Blob) 이미지는 remarkImgToJsx가 처리하지 못하므로 치수를 포함한 next/image JSX로 출력
        state.write(
          `<Image alt=${jsxAttr(alt)} src=${jsxAttr(src)} width={${width}} height={${height}} />`
        )
      } else {
        state.write(`![${(alt ?? '').replace(/[[\]]/g, '\\$&')}](${src})`)
      }
      state.closeBlock(node)
    },
    inlineMath(state, node) {
      // 인라인 수식은 $$…$$ — 파서에서 홑달러 수식($…$)을 끈 것과 짝을 이룬다
      state.write(`$$${node.attrs.latex}$$`)
    },
    table(state, node) {
      const rows: string[][] = []
      let headerFromFirstRow = false
      node.forEach((row, _offset, rowIndex) => {
        const cells: string[] = []
        row.forEach((cell) => {
          if (rowIndex === 0 && cell.type.name === 'tableHeader') headerFromFirstRow = true
          // 셀 내용(문단들)을 재귀 직렬화해 GFM 인라인 셀로 축약
          const parts: string[] = []
          cell.forEach((child) => {
            // biome-ignore lint/style/noNonNullAssertion: doc 노드는 스키마에 항상 존재
            const sub = serializer.serialize(schema.nodes.doc!.create(null, [child]), {
              tightLists: true,
            })
            parts.push(sub.trim().replace(/\n+/g, ' '))
          })
          cells.push(parts.join('<br />').replace(/\|/g, '\\|'))
        })
        rows.push(cells)
      })
      if (rows.length === 0) return
      void headerFromFirstRow // GFM은 첫 행을 항상 헤더로 취급
      const colCount = Math.max(...rows.map((r) => r.length))
      const line = (cells: string[]) =>
        `| ${Array.from({ length: colCount }, (_, i) => cells[i] ?? '').join(' | ')} |`
      state.write(`${line(rows[0])}\n`)
      state.write(`| ${Array.from({ length: colCount }, () => '---').join(' | ')} |\n`)
      for (const row of rows.slice(1)) {
        state.write(`${line(row)}\n`)
      }
      state.closeBlock(node)
    },
    tableRow() {
      // table 핸들러에서 직접 처리
    },
    tableCell() {
      // table 핸들러에서 직접 처리
    },
    tableHeader() {
      // table 핸들러에서 직접 처리
    },
    blockMath(state, node) {
      state.write(`$$\n${node.attrs.latex}\n$$`)
      state.closeBlock(node)
    },
    youtube(state, node) {
      const id = extractYoutubeId(String(node.attrs.src ?? ''))
      if (id) {
        state.write(`<YouTube id=${jsxAttr(id)} />`)
      } else {
        // ID를 추출할 수 없으면 링크로 보존
        state.write(`[${node.attrs.src}](${node.attrs.src})`)
      }
      state.closeBlock(node)
    },
  },
  {
    bold: { open: '**', close: '**', mixable: true, expelEnclosingWhitespace: true },
    italic: { open: '_', close: '_', mixable: true, expelEnclosingWhitespace: true },
    strike: { open: '~~', close: '~~', mixable: true, expelEnclosingWhitespace: true },
    underline: { open: '<u>', close: '</u>', mixable: true },
    code: {
      open(_state, _mark, parent, index) {
        return backticksFor(parent.child(index), -1)
      },
      close(_state, _mark, parent, index) {
        return backticksFor(parent.child(index - 1), 1)
      },
      escape: false,
    },
    link: {
      open: '[',
      close(_state, mark) {
        return `](${mark.attrs.href})`
      },
      mixable: false,
    },
  },
  {
    // MDX에서는 <와 {가 JSX/표현식 시작 문자라 추가로 이스케이프.
    // $는 remark-math가 수식으로 삼키므로("$1 billion … $2.5 billion" → KaTeX) 본문 텍스트에서는 항상 이스케이프한다.
    escapeExtraCharacters: /[<{$]/g,
  }
)

// biome-ignore lint/suspicious/noExplicitAny: Tiptap JSON 문서
export function serializeToMdx(contentJson: any): string {
  const doc = ProseMirrorNode.fromJSON(schema, contentJson)
  return serializer.serialize(doc, { tightLists: true })
}

export type { MarkdownSerializerState }
