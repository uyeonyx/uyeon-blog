/**
 * 서버 컴포넌트에서 구조화 데이터를 렌더한다 — 초기 HTML에 들어가고 클라이언트 번들에는 빠진다.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
