'use client'

// 부수효과 import — 소스에서 쓰는 Iconify 아이콘을 번들에서 등록 (런타임 API 페치 제거)
import '@/lib/icons/register'

import { ThemeProvider } from 'next-themes'
import siteMetadata from '@/data/siteMetadata'

export function ThemeProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme={siteMetadata.theme} enableSystem>
      {children}
    </ThemeProvider>
  )
}
