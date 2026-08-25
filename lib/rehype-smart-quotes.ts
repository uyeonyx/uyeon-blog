import { visit } from 'unist-util-visit'
import { smartQuotes } from './utils'

// hast/unist 타입 패키지는 의존성에 없다 — 이 플러그인이 실제로 만지는 모양만 선언한다.
interface HastRoot {
  type: string
  children?: unknown[]
}
interface HastText {
  type: 'text'
  value: string
}

/**
 * Rehype plugin to convert straight quotes to curly quotes in text nodes
 */
export default function rehypeSmartQuotes() {
  return (tree: HastRoot) => {
    visit(tree, 'text', (node: HastText) => {
      if (node.value) {
        node.value = smartQuotes(node.value)
      }
    })
  }
}
