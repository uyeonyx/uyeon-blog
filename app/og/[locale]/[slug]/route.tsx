// 대표이미지가 없는 글의 OG 이미지를 동적 생성한다 (1200×630).
// 대표이미지가 있는 글은 generateMetadata가 그 이미지를 직접 가리키므로 이 라우트를 쓰지 않는다.
import { slug as slugify } from 'github-slugger'
import { ImageResponse } from 'next/og'
import siteMetadata from '@/data/siteMetadata'
import { getPost } from '@/lib/db/posts'
import { getTagLabelMap } from '@/lib/db/tags'
import { HTML_LANG, isLocale } from '@/lib/i18n/config'

export const runtime = 'nodejs'

const WIDTH = 1200
const HEIGHT = 630

// 제목에 쓰인 글자만 담은 서브셋 폰트를 Google Fonts에서 받아온다 (한글 전체 폰트는 수 MB라 부적합).
// 브라우저 UA 없이 요청하면 css2가 ttf URL을 반환한다.
async function loadFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`
    const cssRes = await fetch(cssUrl, { signal: AbortSignal.timeout(5_000) })
    if (!cssRes.ok) return null
    const css = await cssRes.text()
    const match = css.match(/src:\s*url\((.+?)\)\s*format\('(?:truetype|opentype)'\)/)
    if (!match) return null
    const fontRes = await fetch(match[1], { signal: AbortSignal.timeout(5_000) })
    if (!fontRes.ok) return null
    return await fontRes.arrayBuffer()
  } catch {
    return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  const { locale, slug } = await params
  if (!isLocale(locale)) return new Response('Not found', { status: 404 })

  const post = await getPost(slug, locale)
  if (!post) return new Response('Not found', { status: 404 })

  const date = new Date(post.date).toLocaleDateString(HTML_LANG[locale], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const labels = await getTagLabelMap(locale)
  const tags = post.tags.slice(0, 3).map((t) => labels[slugify(t)] ?? t)
  const fontText = `${post.title}${siteMetadata.headerTitle}${date}${tags.join('')}`
  const fontData = await loadFont(fontText)

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: 'linear-gradient(135deg, #0b1220 0%, #14263c 60%, #1b3a55 100%)',
        color: '#f1f5f9',
        fontFamily: 'Noto Sans KR, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 9999,
            background: 'linear-gradient(135deg, #64a8d8, #2d6ea3)',
          }}
        />
        <div style={{ fontSize: 30, fontWeight: 700, color: '#a8cbe8' }}>
          {siteMetadata.headerTitle}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: post.title.length > 40 ? 56 : 68,
          fontWeight: 700,
          lineHeight: 1.25,
          letterSpacing: '-0.02em',
          wordBreak: 'keep-all',
        }}
      >
        {post.title}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 26 }}>
        <div style={{ display: 'flex', color: '#94a3b8' }}>{date}</div>
        {tags.map((tag) => (
          <div
            key={tag}
            style={{
              display: 'flex',
              padding: '6px 18px',
              borderRadius: 9999,
              background: 'rgba(100, 168, 216, 0.16)',
              border: '1px solid rgba(100, 168, 216, 0.35)',
              color: '#a8cbe8',
            }}
          >
            {tag}
          </div>
        ))}
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      ...(fontData
        ? {
            fonts: [
              {
                name: 'Noto Sans KR',
                data: fontData,
                weight: 700 as const,
                style: 'normal' as const,
              },
            ],
          }
        : {}),
      headers: {
        // CDN 캐시는 revalidateTag('posts')로 무효화되지 않는다 —
        // 제목을 고쳐도 OG 카드에 반영되기까지 최대 1시간 걸린다는 뜻.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}
