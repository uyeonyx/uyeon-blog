// 컴파일된 MDX(body.code)를 서버에서 평가한다 — getMDXComponent는 내부적으로 new Function을
// 쓰므로 클라이언트에서 돌리면 CSP 'unsafe-eval'이 필요해지고 본문이 RSC 페이로드에 이중으로
// 실린다. 'server-only'로 클라이언트 번들 유입을 빌드 타임에 차단한다.
// (admin 프리뷰는 예외적으로 클라이언트 평가를 유지한다 — components/admin/editor-page/PreviewDialog.tsx)
import 'server-only'
import type { MDXComponents } from 'mdx/types'
import { getMDXComponent } from 'mdx-bundler/client'
import { components as defaultComponents } from '@/components/MDXComponents'

interface MDXServerRendererProps {
  code: string
  components?: MDXComponents
  // biome-ignore lint/suspicious/noExplicitAny: MDX 컴포넌트로 스프레드되는 임의 props (pliny MDXLayoutRenderer와 동일 계약)
  [key: string]: any
}

export default function MDXServerRenderer({ code, components, ...rest }: MDXServerRendererProps) {
  const Component = getMDXComponent(code)
  return <Component components={{ ...defaultComponents, ...components }} {...rest} />
}
