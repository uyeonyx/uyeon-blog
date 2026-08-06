import { Analytics, type AnalyticsConfig } from 'pliny/analytics'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { CustomSearchProvider } from '@/components/SearchProvider'
import SectionContainer from '@/components/SectionContainer'
import siteMetadata from '@/data/siteMetadata'

// 공개 사이트 공통 chrome — (site) 레이아웃과 루트 not-found가 공유
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Analytics analyticsConfig={siteMetadata.analytics as AnalyticsConfig} />
      <SectionContainer>
        <CustomSearchProvider>
          <Header />
          <main className="mb-auto min-h-screen">{children}</main>
          <Footer />
        </CustomSearchProvider>
      </SectionContainer>
    </>
  )
}
