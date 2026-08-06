import type { Metadata } from 'next'
import NotFoundContent from '@/components/NotFoundContent'
import RootHtml from '@/components/RootHtml'
import SiteChrome from '@/components/SiteChrome'
import siteMetadata from '@/data/siteMetadata'
import { DEFAULT_LOCALE, HTML_LANG } from '@/lib/i18n/config'
import { I18nProvider } from '@/lib/i18n/i18n-context'
import { translate } from '@/lib/i18n/translate'

/**
 * 어떤 라우트에도 매칭되지 않은 URL(`/foo/bar` 등)의 404.
 *
 * 루트 레이아웃이 둘(공개/관리자)이라 합성할 단일 레이아웃이 없어서 필요하다.
 * 레이아웃 렌더를 건너뛰므로 <html>·<body>·전역 스타일·테마를 여기서 직접 갖춰야 한다
 * — RootHtml이 그 셋을 모두 담고 있으므로 그대로 재사용한다.
 *
 * 로케일 세그먼트 안에서 난 notFound()는 여기가 아니라
 * app/(site)/[locale]/not-found.tsx가 받는다.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.siteUrl),
  title: { absolute: `404 | ${siteMetadata.title}` },
  description: translate(DEFAULT_LOCALE, 'notFound.message'),
  robots: { index: false, follow: true },
}

export default function GlobalNotFound() {
  return (
    <RootHtml lang={HTML_LANG[DEFAULT_LOCALE]}>
      <I18nProvider locale={DEFAULT_LOCALE}>
        <SiteChrome>
          <NotFoundContent />
        </SiteChrome>
      </I18nProvider>
    </RootHtml>
  )
}
