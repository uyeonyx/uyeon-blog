import { genPageMetadata } from 'app/seo'
import { getAuthorPair } from '@/lib/db/authors'
import AboutPageClient from './AboutPageClient'

// DB 조회 페이지 — 요청 시 렌더 (데이터는 'authors' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export const metadata = genPageMetadata({ title: 'About' })

export default async function Page() {
  const authors = await getAuthorPair('default')
  return <AboutPageClient authors={authors} />
}
