<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 이 저장소의 규약

## 라우팅

- **모든 공개 라우트는 `app/(site)/[locale]/**` 아래에 있다.** 새 페이지를 루트에 만들지 말 것.
  로케일을 갖지 않는 예외는 `/admin`, `/api/**`, `/mcp`, `/og`, `/robots.txt`, `/sitemap.xml`,
  `/llms.txt`, `/llms-full.txt`, `/.well-known/**` 뿐이다.
- 루트 레이아웃이 **두 개**다: `app/(site)/[locale]/layout.tsx`(공개)와 `app/(admin)/layout.tsx`(관리자).
  `<html>`·`<body>` 껍데기는 `components/RootHtml.tsx`가 공유한다. `app/layout.tsx`는 존재하지 않는다.
- 합성할 단일 레이아웃이 없으므로 미매칭 URL의 404는 `app/global-not-found.tsx`가 받는다
  (`experimental.globalNotFound`). 이 파일은 레이아웃을 건너뛰므로 `<html>`부터 직접 렌더해야 한다.
  로케일 안에서 난 `notFound()`는 `app/(site)/[locale]/not-found.tsx`가 받는다.
- **`useSearchParams()`는 레이아웃 계층 클라이언트 컴포넌트에서 정적 프리렌더를 깨뜨린다.**
  꼭 필요하면 `components/LanguageSwitch.tsx`처럼 Suspense로 감싸고 폴백도 동작하는 UI로 만든다.
- 페이지는 `assertLocale(params.locale)`로 로케일을 검증한다. 레이아웃에서 `notFound()`를 던지지 않는다
  (받아줄 상위 경계가 없다).
- 내부 링크는 `@/components/Link`를 쓴다 — 로케일 접두사를 자동으로 붙인다. `next/link` 직접 사용 금지.
- 레이아웃 컴포넌트에서 `usePathname()`으로 경로를 역산하지 않는다. 필요한 값은 페이지가 prop으로 내린다.

자세한 내용은 `I18N_GUIDE.md`.

## 데이터

- 콘텐츠는 전부 Postgres(Drizzle). `lib/db/*`의 조회 함수는 `language` 인자를 받는다.
- `unstable_cache` 로더는 양 언어를 통째로 캐시하고 필터는 accessor에서 한다
  (언어별 캐시 키로 쪼개면 `revalidateTag('posts')` 시 한쪽만 신선한 창이 생긴다).

## SEO

- 페이지 메타데이터는 `genPageMetadata({ locale, seg, ... })`(`app/seo.tsx`)로만 만든다.
- 구조화 데이터는 `lib/seo/jsonld.ts` + `components/JsonLd.tsx`. DB 계층에 두지 않는다.
- 절대 URL이 필요하면 `lib/seo/urls.ts`의 `absoluteUrl`/`localeUrl`을 쓴다
  (Metadata API의 `metadataBase`가 적용되지 않는 소비자와 출력을 일치시키기 위함).
