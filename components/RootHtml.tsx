import 'css/tailwind.css'
import 'pliny/search/algolia.css'
import 'remark-github-blockquote-alert/alert.css'

import { ThemeProviders } from 'app/theme-providers'
import { Space_Grotesk } from 'next/font/google'

const space_grotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

/**
 * 루트 레이아웃이 두 개(공개 사이트 / 관리자)이므로 <html>·<body> 껍데기를 여기로 모은다.
 * lang은 공개 사이트에서 URL의 로케일로, 관리자에서는 'ko'로 고정된다.
 */
export default function RootHtml({ lang, children }: { lang: string; children: React.ReactNode }) {
  const basePath = process.env.BASE_PATH || ''

  return (
    <html
      lang={lang}
      className={`${space_grotesk.variable} scroll-smooth`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href={`${basePath}/static/favicons/apple-touch-icon.png`}
      />
      <link rel="icon" type="image/svg+xml" href={`${basePath}/static/favicons/icon.svg`} />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href={`${basePath}/static/favicons/favicon-32x32.png`}
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href={`${basePath}/static/favicons/favicon-16x16.png`}
      />
      <link rel="manifest" href={`${basePath}/static/favicons/site.webmanifest`} />
      <link
        rel="mask-icon"
        href={`${basePath}/static/favicons/safari-pinned-tab.svg`}
        color="#0891b2"
      />
      <meta name="msapplication-TileColor" content="#0b1220" />
      <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fff" />
      <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000" />
      <body className="bg-linear-to-br from-gray-50 via-white to-gray-50 pl-[calc(100vw-100%)] text-black antialiased dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 dark:text-white">
        <ThemeProviders>{children}</ThemeProviders>
      </body>
    </html>
  )
}
