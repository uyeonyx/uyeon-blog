import path from 'node:path'
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic'
import { remarkCodeTitles, remarkImgToJsx } from 'pliny/mdx-plugins/index.js'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeCitation from 'rehype-citation'
import rehypeKatex from 'rehype-katex'
import rehypeKatexNoTranslate from 'rehype-katex-notranslate'
import rehypePresetMinify from 'rehype-preset-minify'
import rehypePrismPlus from 'rehype-prism-plus'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { remarkAlert } from 'remark-github-blockquote-alert'
import remarkMath from 'remark-math'
import rehypeSmartQuotes from '../rehype-smart-quotes'

const root = process.cwd()

// heroicon mini link
const icon = fromHtmlIsomorphic(
  `
  <span class="content-header-link">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 linkicon">
  <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
  <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
  </svg>
  </span>
`,
  { fragment: true }
)

// 관리자 저장/미리보기/MCP 파이프라인이 공유하는 remark/rehype 플러그인 체인.

// biome-ignore lint/suspicious/noExplicitAny: 플러그인 튜플 타입은 소비처마다 다르다
export const sharedRemarkPlugins: any[] = [
  remarkGfm,
  remarkCodeTitles,
  remarkMath,
  remarkImgToJsx,
  remarkAlert,
]

// biome-ignore lint/suspicious/noExplicitAny: 플러그인 튜플 타입은 소비처마다 다르다
export const sharedRehypePlugins: any[] = [
  rehypeSlug,
  [
    rehypeAutolinkHeadings,
    {
      behavior: 'prepend',
      headingProperties: {
        className: ['content-header'],
      },
      content: icon,
    },
  ],
  rehypeKatex,
  rehypeKatexNoTranslate,
  [rehypeCitation, { path: path.join(root, 'data') }],
  [rehypePrismPlus, { defaultLanguage: 'js', ignoreMissing: true }],
  rehypeSmartQuotes, // 모든 텍스트 노드에 스마트 따옴표 적용
  rehypePresetMinify,
]
