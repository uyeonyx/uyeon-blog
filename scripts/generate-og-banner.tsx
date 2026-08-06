// 사이트 기본 소셜 배너(public/static/images/og-banner.png)를 브랜드 마크로 생성한다.
// 글 단위 OG는 app/og/[slug]/route.tsx가 동적으로 만들고, 이 파일은 홈·태그·프로젝트 등
// 대표이미지가 없는 나머지 페이지의 fallback 배너를 만든다.
// 실행: pnpm tsx scripts/generate-og-banner.tsx
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ImageResponse } from 'next/og'

const WIDTH = 1200
const HEIGHT = 630
const OUT = resolve(process.cwd(), 'public/static/images/og-banner.png')

// favicons/icon.svg의 uy 리가처에서 배경 rect를 뺀 마크만 (투명 배경, 여백 맞춰 크롭)
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="9 10 46 43" width="220" height="206">
  <path d="M32 19 v13 a9 9 0 0 0 18 0 v-13 M50 19 v20 a9 9 0 0 1 -9 9 h-4"
        fill="none" stroke="#0284c7" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14 15 v13 a9 9 0 0 0 18 0 v-13"
        fill="none" stroke="#7dd3fc" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
const MARK_SRC = `data:image/svg+xml;base64,${Buffer.from(MARK).toString('base64')}`

async function loadFont(weight: number, text: string): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@${weight}&text=${encodeURIComponent(text)}`
  const css = await (await fetch(cssUrl)).text()
  const match = css.match(/src:\s*url\((.+?)\)\s*format\('(?:truetype|opentype)'\)/)
  if (!match) throw new Error(`폰트 URL을 찾지 못했다 (weight ${weight})`)
  return await (await fetch(match[1])).arrayBuffer()
}

const WORDMARK = 'uyeon.dev'
const TAGLINE = 'Engineering principles, system design, and deep focus on what matters'

async function main() {
  const [bold, regular] = await Promise.all([loadFont(700, WORDMARK), loadFont(400, TAGLINE)])

  const image = new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b1220 0%, #14263c 60%, #1b3a55 100%)',
        fontFamily: 'Space Grotesk',
      }}
    >
      {/* satori(next/og) 렌더러는 next/image를 지원하지 않는다 */}
      {/* biome-ignore lint/performance/noImgElement: ImageResponse 안에서는 <img>만 쓸 수 있다 */}
      <img src={MARK_SRC} width={220} height={206} alt="" />
      <div
        style={{
          display: 'flex',
          marginTop: 36,
          fontSize: 84,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: '#f1f5f9',
        }}
      >
        {WORDMARK}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 22,
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: '-0.01em',
          color: '#94a3b8',
        }}
      >
        {TAGLINE}
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Space Grotesk', data: bold, weight: 700, style: 'normal' },
        { name: 'Space Grotesk', data: regular, weight: 400, style: 'normal' },
      ],
    }
  )

  await writeFile(OUT, Buffer.from(await image.arrayBuffer()))
  console.log(`생성 완료: ${OUT}`)
}

main()
