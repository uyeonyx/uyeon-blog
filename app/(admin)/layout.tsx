import 'css/editor.css'

import RootHtml from '@/components/RootHtml'
import { I18nProvider } from '@/lib/i18n/i18n-context'

export const metadata = {
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootHtml lang="ko">
      {/* 미리보기가 MDXComponents → components/Link 를 거치므로 관리자에도 Provider가 필요하다 */}
      <I18nProvider locale="ko">
        <div className="min-h-screen">{children}</div>
      </I18nProvider>
    </RootHtml>
  )
}
