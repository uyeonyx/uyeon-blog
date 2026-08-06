// 유튜브 URL → 비디오 ID 추출 — 직렬화기와 렌더 컴포넌트가 공유
const YOUTUBE_ID_PATTERNS = [
  /youtu\.be\/([\w-]{6,})/,
  /youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/|live\/)([\w-]{6,})/,
]

export function extractYoutubeId(url: string): string | null {
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function isYoutubeUrl(url: string): boolean {
  return extractYoutubeId(url) !== null
}
