// llms-full.txt — 전체 게시글 본문 마크다운 (slug당 1건, 한국어 우선).
// DB 조회 페이지 — 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
import siteMetadata from '@/data/siteMetadata'
import { getAllPublishedMarkdown } from '@/lib/db/posts'

export const dynamic = 'force-dynamic'

export async function GET() {
  const posts = await getAllPublishedMarkdown()

  const sections = posts.map((post) => {
    const tr = post.translations.ko ?? post.translations.en
    if (!tr) return ''
    return [
      '---',
      `title: ${tr.title}`,
      `url: ${siteMetadata.siteUrl}/blog/${post.slug}`,
      `date: ${post.date.slice(0, 10)}`,
      ...(post.tags.length > 0 ? [`tags: ${post.tags.join(', ')}`] : []),
      '---',
      '',
      tr.markdown.trim(),
    ].join('\n')
  })

  const body = [
    `# ${siteMetadata.title} — full content`,
    '',
    '> Korean version of each post (English translations available at each URL).',
    '',
    sections.join('\n\n'),
  ].join('\n')

  return new Response(`${body}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
