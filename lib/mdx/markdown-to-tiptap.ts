// 마크다운(MDX) 문자열 → Tiptap JSON. 에이전트/마이그레이션이 마크다운으로 글을 쓰는 진입점.
// remark-mdx를 포함해 serialize.ts가 출력하는 <Image/>, <YouTube/>, <u> JSX를 왕복 파싱한다.
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { type MdastToTiptapResult, mdastToTiptapWithWarnings } from './mdast-to-tiptap'

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkMath)

/** 마크다운 → Tiptap 문서 + 손실 가능성 경고 목록 */
export function markdownToTiptap(markdown: string): MdastToTiptapResult {
  const tree = parser.parse(markdown)
  return mdastToTiptapWithWarnings(tree)
}
