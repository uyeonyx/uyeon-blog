// 관리자 저장/미리보기용 런타임 MDX 컴파일 — contentlayer와 동일한 파이프라인(mdx-bundler + 공유 플러그인)
// mdx-bundler(esbuild)는 Next 빌드 워커의 모듈 수집 단계에서 문제를 일으키므로 요청 시점에 지연 로드한다.
import { extractTocHeadings } from 'pliny/mdx-plugins/index.js'
import readingTime from 'reading-time'
import { sharedRehypePlugins, sharedRemarkPlugins } from './plugins'

export interface CompiledPost {
  code: string
  // biome-ignore lint/suspicious/noExplicitAny: pliny Toc 타입 그대로 전달
  toc: any
  readingTime: ReturnType<typeof readingTime>
}

export async function compilePostMdx(source: string): Promise<CompiledPost> {
  const { bundleMDX } = await import('mdx-bundler')
  const result = await bundleMDX({
    source,
    cwd: process.cwd(),
    mdxOptions(options) {
      options.remarkPlugins = [...(options.remarkPlugins ?? []), ...sharedRemarkPlugins]
      options.rehypePlugins = [...(options.rehypePlugins ?? []), ...sharedRehypePlugins]
      return options
    },
  })
  const toc = await extractTocHeadings(source)
  return { code: result.code, toc, readingTime: readingTime(source) }
}
