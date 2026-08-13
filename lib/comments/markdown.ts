// 댓글 본문 렌더링 — 글 본문의 MDX 파이프라인(bundleMDX)과 완전히 분리한다.
// 댓글은 신뢰할 수 없는 입력이므로 허용 태그를 화이트리스트로 좁히고 raw HTML을 통과시키지 않는다.
// 결과 HTML은 저장 시점에 한 번 만들어 comments.body_html에 넣고, 읽기 경로에서는 재파싱하지 않는다.
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

export const COMMENT_MAX_LENGTH = 5000

/** 익명 댓글에 허용하는 링크 수 — 스팸의 주 목적이 링크 삽입이다 */
export const ANONYMOUS_MAX_LINKS = 2

// 이미지·헤딩·테이블·raw HTML은 허용하지 않는다. 코드는 기술 블로그라 유지한다.
const COMMENT_SCHEMA = {
  ...defaultSchema,
  tagNames: ['p', 'br', 'strong', 'em', 'del', 'a', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li'],
  // defaultSchema의 attributes를 물려받지 않고 통째로 대체한다 (className 등 전부 제거)
  attributes: {
    a: ['href'],
  },
  protocols: {
    href: ['http', 'https', 'mailto'],
  },
}

interface HastNode {
  type: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

/**
 * sanitize 이후에 링크 속성을 강제한다.
 * sanitize 전에 붙이면 rel/target이 화이트리스트에 없어 도로 지워지고,
 * 화이트리스트에 넣으면 작성자가 임의 값을 지정할 수 있게 되므로 순서가 중요하다.
 */
function hardenLinks() {
  return (tree: HastNode) => {
    const visit = (node: HastNode) => {
      if (node.type === 'element' && node.tagName === 'a') {
        node.properties = {
          ...node.properties,
          rel: 'nofollow ugc noopener noreferrer',
          target: '_blank',
        }
      }
      for (const child of node.children ?? []) visit(child)
    }
    visit(tree)
  }
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, {
    // 기본 동작은 raw HTML 노드를 통째로 버리는데, 그러면 "<div>는 이렇게 씁니다" 같은 댓글에서
    // 같은 블록의 일반 텍스트까지 함께 사라진다. 텍스트 노드로 바꾸면 stringify가 이스케이프해
    // 화면에는 <div>가 그대로 보이면서 실행은 되지 않는다.
    handlers: {
      html: (_state: unknown, node: { value: string }) => ({ type: 'text', value: node.value }),
    },
  })
  .use(rehypeSanitize, COMMENT_SCHEMA)
  .use(hardenLinks)
  .use(rehypeStringify)

export interface RenderedComment {
  html: string
  linkCount: number
}

export async function renderCommentMarkdown(markdown: string): Promise<RenderedComment> {
  const html = String(await processor.process(markdown))
  // sanitize를 통과한 결과에서 세므로, 마크다운 원문의 링크 표기가 아니라 실제 렌더된 링크 수다
  const linkCount = (html.match(/<a\s/g) ?? []).length
  return { html, linkCount }
}

/** 본문이 실제 내용을 담고 있는지 — 공백·개행만 있는 제출을 막는다 */
export function isBlankBody(markdown: string): boolean {
  return markdown.replace(/\s/g, '').length === 0
}
