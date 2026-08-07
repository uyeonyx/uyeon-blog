const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

// You might need to insert additional domains in script-src if you are using external services
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' giscus.app umami.uyeon.dev;
  style-src 'self' 'unsafe-inline';
  img-src * blob: data:;
  media-src *.s3.amazonaws.com;
  connect-src *;
  font-src 'self';
  frame-src giscus.app www.youtube-nocookie.com
`

const securityHeaders = [
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\n/g, ''),
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

// 주의: 블로그 글이 DB(Neon) 런타임 조회로 전환되고 /admin(작성자 모드)이 서버 API를
// 사용하므로 static export(EXPORT=1)는 더 이상 지원되지 않는다.
const output = process.env.EXPORT ? 'export' : undefined
const basePath = process.env.BASE_PATH || undefined
const unoptimized = process.env.UNOPTIMIZED ? true : undefined

/**
 * @type {import('next/dist/next-server/server/config').NextConfig}
 **/
module.exports = () => {
  const plugins = [withBundleAnalyzer]
  return plugins.reduce((acc, next) => next(acc), {
    output,
    basePath,
    reactStrictMode: true,
    trailingSlash: false,
    experimental: {
      // 루트 레이아웃이 둘(공개/관리자)이라 합성할 단일 레이아웃이 없다 → app/global-not-found.tsx
      globalNotFound: true,
    },
    pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
    // 관리자 저장/미리보기의 런타임 MDX 컴파일(mdx-bundler + esbuild)은 번들링 대상에서 제외
    serverExternalPackages: ['esbuild', 'mdx-bundler', 'rehype-preset-minify'],
    outputFileTracingIncludes: {
      '/api/admin/**': ['./data/references-data.bib'],
      // MCP 라우트도 mdx 컴파일(rehype-citation의 data/ 런타임 읽기)을 수행한다
      '/api/mcp/**': ['./data/references-data.bib'],
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'picsum.photos',
        },
        {
          protocol: 'https',
          hostname: '*.public.blob.vercel-storage.com',
        },
      ],
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      unoptimized,
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: securityHeaders,
        },
      ]
    },
    // 공개 라우트는 전부 /ko, /en 아래에 있다. 무접두사 URL은 여기서 흡수한다.
    // proxy.ts는 admin 인증 전용으로 남긴다 — matcher를 넓히면 모든 공개 요청에 JWT 검증이 걸린다.
    async redirects() {
      // `:path*`는 0개 세그먼트일 때 후행 슬래시를 남겨 `/blog` → `/ko/blog/` → `/ko/blog`
      // 2홉이 된다. 목록 경로는 exact와 `:path+`로 쪼갠다.
      const LEGACY = [
        '/blog',
        '/blog/:path+',
        '/tags',
        '/tags/:path+',
        '/projects',
        '/about',
        '/ai',
        '/feed.xml',
        '/search.json',
      ]
      return [
        // 쿠키 기반 응답이므로 영구(308)로 주면 브라우저가 캐시해 언어가 고착된다
        {
          source: '/',
          has: [{ type: 'cookie', key: 'NEXT_LOCALE', value: '(?<loc>ko|en)' }],
          destination: '/:loc',
          permanent: false,
        },
        { source: '/', destination: '/ko', permanent: false },
        ...LEGACY.map((source) => ({
          source,
          destination: `/ko${source}`,
          permanent: true,
        })),
        // 소셜 플랫폼 캐시에 박혀 있는 기존 OG URL
        { source: '/og/:slug', destination: '/og/ko/:slug', permanent: true },
      ]
    },
    webpack: (config, _options) => {
      config.module.rules.push({
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      })

      return config
    },
    turbopack: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  })
}
