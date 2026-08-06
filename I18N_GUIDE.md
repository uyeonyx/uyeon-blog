# 다국어 가이드

이 블로그는 한국어(ko)와 영어(en)를 지원하며, **언어는 URL로 결정된다**.

## URL 규칙

```
https://uyeon.dev/ko/blog/some-post   ← 한국어
https://uyeon.dev/en/blog/some-post   ← 영어
```

- 모든 공개 라우트는 `app/(site)/[locale]/**` 아래에 있다. 새 페이지를 추가할 때도 반드시 이 아래에 만든다.
- 무접두사 URL(`/blog/x`, `/about`, `/feed.xml` …)은 `next.config.js`의 `redirects()`가 **308**로 `/ko/...`에 보낸다.
- 루트 `/`는 `NEXT_LOCALE` 쿠키가 있으면 그 언어로, 없으면 `/ko`로 **307**(비영구) 보낸다.
  쿠키 의존 응답이라 영구 리다이렉트를 쓰면 브라우저가 캐시해 언어가 고착된다.
- **브라우저 언어 자동 감지는 하지 않는다.** 크롤러가 항상 같은 콘텐츠를 보게 해서 hreflang 신호를 깨끗하게 유지하기 위함이다.
  사용자가 헤더의 언어 스위처를 누르면 그 선택이 쿠키에 기록되고, 다음번 루트 진입에만 쓰인다.

- 어떤 라우트에도 매칭되지 않는 URL(`/foo/bar`)은 `app/global-not-found.tsx`가 404를 준다.
  로케일 세그먼트 안에서 난 `notFound()`는 `app/(site)/[locale]/not-found.tsx`가 받는다.

로케일 세그먼트를 갖지 않는 경로(프로토콜 엔드포인트):
`/admin`, `/api/**`, `/mcp`, `/og/[locale]/[slug]`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt`, `/.well-known/**`

## 콘텐츠

글·프로젝트·소개는 전부 Postgres에 있고 `*_translations` 테이블이 언어별 행을 갖는다.
MDX 파일이나 `.ko.mdx` 파일명 규칙은 더 이상 존재하지 않는다 — 작성은 `/admin` 또는 MCP로 한다.

- 한쪽 언어만 있는 글: 반대 언어 URL은 **200 + noindex** 안내 페이지(`PostNotice variant="untranslated"`)를 주고,
  hreflang과 sitemap에는 실제 존재하는 언어만 싣는다.
- 태그는 `tags` 마스터 테이블이 slug → `labelKo`/`labelEn`을 갖는다. 글의 frontmatter 태그는 slug 기준이다.

## 코드에서 언어 다루기

| 상황 | 방법 |
|---|---|
| 서버 컴포넌트/라우트 | `params.locale` → `assertLocale()` (`lib/i18n/route.ts`) |
| 서버에서 번역 문자열 | `getTranslations(locale)` (`lib/i18n/translate.ts`) |
| 클라이언트 컴포넌트 | `useI18n()` → `{ locale, t }` |
| DB 조회 | `getPublishedCores(locale)`, `getPost(slug, locale)`, `getTagCounts(locale)` … |
| 내부 링크 | `@/components/Link` — 로케일 접두사를 자동으로 붙인다 (멱등) |
| `router.push` 등 Link 우회 | `withLocale(href, locale)` (`lib/i18n/paths.ts`) |
| 절대 URL / hreflang | `lib/seo/urls.ts`의 `localeUrl`, `hreflangMap`, `absoluteUrl` |

`next/link`를 직접 import하는 곳은 `components/Link.tsx`와 `components/LanguageSwitch.tsx`(이미 완성된 절대경로를 쓴다) 둘뿐이어야 한다:

```bash
grep -rn "from 'next/link'" app components layouts | grep -v admin
```

`I18nProvider`는 `locale`을 prop으로 받는다. localStorage·`navigator.language`를 읽지 않으므로
SSR HTML의 언어가 URL과 항상 일치하고 초기 깜빡임이 없다.

## UI 문자열

`lib/i18n/locales/{ko,en}.json`. `t('a.b.c')`로 조회하고, `{n}`·`{tag}` 같은 플레이스홀더는
`t('seo.pageSuffix', { n: 2 })` 형태로 치환한다. 미스 시 키를 그대로 반환한다.

## SEO 관련 규칙

- 페이지 메타데이터는 반드시 `genPageMetadata({ locale, seg, ... })`(`app/seo.tsx`)로 만든다.
  canonical·hreflang·RSS `alternates`를 한 곳에서 조립한다 — Metadata는 세그먼트 간 shallow merge라
  자식이 `alternates`를 직접 건드리면 부모의 RSS types가 사라진다.
- 페이지네이션(`/blog/page/N`)은 self-canonical + `noHreflang: true`이고 sitemap에는 넣지 않는다.
  언어별 글 수가 달라 N페이지끼리는 번역 관계가 아니다.
- 구조화 데이터는 `lib/seo/jsonld.ts`에서 만들고 서버 컴포넌트(`components/JsonLd.tsx`)로 렌더한다.
  DB 계층에 두지 않는다 — author/locale/canonical은 페이지 레벨 정보다.

## 검증

```bash
curl -sI localhost:3000/blog/x                    # 308 → /ko/blog/x
curl -sI -H 'Cookie: NEXT_LOCALE=en' localhost:3000/   # 307 → /en
curl -s localhost:3000/en/blog | grep -c '/ko/ko/'     # 0
curl -s localhost:3000/sitemap.xml | xmllint --noout -
grep -rn "usePathname" layouts                     # 0 (경로 역산 금지)
```
