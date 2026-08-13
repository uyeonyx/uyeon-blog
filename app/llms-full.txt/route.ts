// llms-full.txt — 전체 게시글 본문 마크다운 (존재하는 번역 전부 — ko/en 각각 섹션).
// DB 조회 페이지 — 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
import siteMetadata from '@/data/siteMetadata'
import { getAllPublishedMarkdown } from '@/lib/db/posts'
import { localeUrl } from '@/lib/seo/urls'

export const dynamic = 'force-dynamic'

export async function GET() {
  const posts = await getAllPublishedMarkdown()

  // ko ?? en으로 하나만 고르면 양 언어 글의 영어 본문이 영영 노출되지 않는다 — 전부 싣는다
  const sections = posts.flatMap((post) =>
    (['ko', 'en'] as const).flatMap((lang) => {
      const tr = post.translations[lang]
      if (!tr) return []
      return [
        [
          '---',
          `title: ${tr.title}`,
          `lang: ${lang}`,
          `url: ${localeUrl(lang, `blog/${post.slug}`)}`,
          `date: ${post.date.slice(0, 10)}`,
          ...(post.tags.length > 0 ? [`tags: ${post.tags.join(', ')}`] : []),
          '---',
          '',
          tr.markdown.trim(),
        ].join('\n'),
      ]
    })
  )

  const body = [
    `# ${siteMetadata.title} — full content`,
    '',
    '> Every available translation of every post (ko/en sections per post).',
    '',
    sections.join('\n\n'),
  ].join('\n')

  return new Response(`${body}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}
