// MDX 본문의 <YouTube id="..." /> — 개인정보 보호 도메인(nocookie) 반응형 임베드
export default function YouTube({ id, title }: { id: string; title?: string }) {
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${id}?modestbranding=1&rel=0`}
      title={title ?? 'YouTube video'}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="aspect-video w-full rounded-xl border-0 shadow-lg"
    />
  )
}
