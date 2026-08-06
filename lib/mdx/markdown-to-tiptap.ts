// 마크다운(MDX) 문자열 → Tiptap JSON. 에이전트/마이그레이션이 마크다운으로 글을 쓰는 진입점.
// remark-mdx를 포함해 serialize.ts가 출력하는 <Image/>, <YouTube/>, <u> JSX를 왕복 파싱한다.
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { type MdastToTiptapResult, mdastToTiptapWithWarnings } from './mdast-to-tiptap'

// singleDollarTextMath: false — plugins.ts의 컴파일 체인과 동일한 수식 문법을 써야 왕복이 어긋나지 않는다
const parser = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkGfm)
  .use(remarkMath, { singleDollarTextMath: false })

/** 마크다운 → Tiptap 문서 + 손실 가능성 경고 목록 */
export function markdownToTiptap(markdown: string): MdastToTiptapResult {
  const tree = parser.parse(markdown)
  return mdastToTiptapWithWarnings(tree)
}
