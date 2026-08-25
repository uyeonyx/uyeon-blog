const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

// MCP 동의 폼은 같은 출처(/api/oauth/authorize)로 POST하지만 그 응답이 클라이언트
// 콜백(claude.ai 등)으로 303을 낸다. Firefox·Safari는 form-action을 리다이렉트 체인에도
// 적용하므로 'self'만으로는 승인 직후 내비게이션이 막힌다(리포트에는 리다이렉트 목적지 대신
// 원래 URL이 찍혀 동일 출처가 막힌 것처럼 보인다). lib/mcp/oauth.ts의 redirect_uri
// 화이트리스트와 같은 호스트만 연다.
const OAUTH_CALLBACK_HOSTS =
  'https://claude.ai https://*.claude.ai https://claude.com https://*.claude.com https://anthropic.com https://*.anthropic.com'

// 공개 라우트는 MDX를 서버에서 평가하므로 'unsafe-eval'이 필요 없다.
// /admin만 예외 — 에디터 프리뷰(PreviewDialog)가 미저장 본문을 클라이언트에서 평가한다.
const buildCsp = ({ allowEval, formAction = "'self'" }) => `
  default-src 'self';
  script-src 'self' ${allowEval ? "'unsafe-eval' " : ''}'unsafe-inline' umami.uyeon.dev;
  style-src 'self' 'unsafe-inline';
  img-src * blob: data:;
  media-src *.s3.amazonaws.com;
  connect-src *;
  font-src 'self';
  frame-src www.youtube-nocookie.com;
  base-uri 'self';
  form-action ${formAction};
  frame-ancestors 'none'
`
// TODO: connect-src * 는 DB 데이터 기반 아이콘의 api.iconify.design 폴백 때문 —
// 콘텐츠 아이콘을 전부 번들에 포함하게 되면 'self' umami.uyeon.dev 로 좁힐 것.
// base-uri는 default-src를 상속하지 않아 명시 필수 (<base> 주입 차단).

const securityHeaders = (csp) => [
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
  {
    key: 'Content-Security-Policy',
    value: csp.replace(/\n/g, ''),
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
    value: 'max-age=31536000; includeSubDomains; preload',
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
      // Next 16 기본은 [75]뿐 — 코드가 요청하는 q값을 열거하지 않으면 _next/image가 400을 반환한다
      qualities: [75, 90],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      unoptimized,
    },
    async headers() {
      // 전체에 공개 CSP를 깔고 /admin만 뒤에서 덮어쓴다 — 같은 키는 나중 매치가 이긴다.
      // (negative lookahead로 쪼개면 /adminfoo처럼 어느 쪽에도 안 걸리는 무헤더 경로가 생긴다)
      return [
        {
          source: '/(.*)',
          headers: securityHeaders(buildCsp({ allowEval: false })),
        },
        {
          source: '/admin/:path*',
          headers: securityHeaders(buildCsp({ allowEval: true })),
        },
        // 동의 화면만 form-action을 넓힌다 — 승인 POST의 303이 클라이언트 콜백으로 나간다
        {
          source: '/admin/oauth/consent',
          headers: securityHeaders(
            buildCsp({ allowEval: true, formAction: `'self' ${OAUTH_CALLBACK_HOSTS}` })
          ),
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
        // 프로젝트 상세가 ?project= 쿼리 모달에서 실제 라우트로 바뀜 — 레거시 URL 흡수
        {
          source: '/:locale(ko|en)/projects',
          has: [{ type: 'query', key: 'project', value: '(?<slug>[a-z0-9-]+)' }],
          destination: '/:locale/projects/:slug',
          permanent: true,
        },
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
