import SiteChrome from '@/components/SiteChrome'
import NotFound from './(site)/not-found'

// 전역 404 — 루트 레이아웃에는 사이트 chrome이 없으므로 직접 감싼다
export default function GlobalNotFound() {
  return (
    <SiteChrome>
      <NotFound />
    </SiteChrome>
  )
}
