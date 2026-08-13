import { Analytics, type AnalyticsConfig } from 'pliny/analytics'
import Footer from '@/components/Footer'
import HeaderClient from '@/components/HeaderClient'
import MotionProvider from '@/components/MotionProvider'
import SectionContainer from '@/components/SectionContainer'
import SearchIsland from '@/components/search/SearchIsland'
import siteMetadata from '@/data/siteMetadata'

// 공개 사이트 공통 chrome — (site) 레이아웃과 루트 not-found가 공유.
// 검색(kbar)은 페이지 트리를 감쌀 필요가 없다 — 팔레트는 포털로 뜨므로 sibling 아일랜드로
// 지연 마운트해 초기 청크에서 뺀다.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Analytics analyticsConfig={siteMetadata.analytics as AnalyticsConfig} />
      <MotionProvider>
        <SectionContainer>
          <HeaderClient />
          <main className="mb-auto min-h-screen">{children}</main>
          <Footer />
        </SectionContainer>
      </MotionProvider>
      <SearchIsland />
    </>
  )
}
