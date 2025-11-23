import { visit } from 'unist-util-visit'
import { smartQuotes } from './utils'

/**
 * Rehype plugin to convert straight quotes to curly quotes in text nodes
 */
export default function rehypeSmartQuotes() {
  return (tree: any) => {
    visit(tree, 'text', (node: any) => {
      if (node.value) {
        node.value = smartQuotes(node.value)
      }
    })
  }
}

