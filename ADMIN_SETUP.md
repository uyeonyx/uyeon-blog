# 작성자 모드 설정 가이드

`/admin`에서 글을 작성/편집/게시하는 관리자 모드가 추가되었다. 글은 더 이상 `data/blog/*.mdx`가 아니라 **Railway Postgres**(싱가포르 리전, 상시 가동)에 저장되고, 이미지는 **Vercel Blob**에 업로드되며, 게시하면 재빌드 없이 즉시 반영된다. Vercel 함수 리전은 DB와 같은 `sin1`으로 고정되어 있다(vercel.json).

> 처음엔 Neon(Vercel Marketplace)을 썼으나 무료 티어의 5분 유휴 콜드스타트(첫 요청 ~2.5초) 때문에 Railway로 이전했다 (2026-08).

## 1회 준비 (필수)

### 1. Railway Postgres
1. Railway 프로젝트 `uyeon-blog`(dev.UY's Projects 워크스페이스)의 `Postgres` 서비스
2. 외부 접속은 TCP proxy 경유 — `railway variables --service Postgres`로 접속 정보 확인
3. `DATABASE_URL`(public proxy URL)을 Vercel 환경변수와 로컬 `.env.local`에 설정

### 2. Vercel Blob 스토어 생성
1. 같은 **Storage** 탭 → **Create Store** → **Blob**
2. `BLOB_READ_WRITE_TOKEN` 자동 주입 — 로컬 `.env`에도 복사

### 3. GitHub OAuth App 등록
1. https://github.com/settings/developers → **New OAuth App**
2. Authorization callback URL: `https://uyeon.dev/api/auth/github/callback`
3. 로컬 개발용으로 하나 더 만들거나 callback을 `http://localhost:3000/api/auth/github/callback`으로 등록
4. `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`를 Vercel 환경변수 + 로컬 `.env`에 추가

### 4. 나머지 환경변수
```bash
ADMIN_SESSION_SECRET=$(openssl rand -base64 32)   # 세션 서명 키
ADMIN_GITHUB_LOGIN=uyeonyx                        # 로그인 허용 계정 (본인)
```

### 5. DB 테이블 생성
```bash
pnpm db:push          # drizzle-kit push — posts / post_translations 테이블 생성
```

### 6. MCP 토큰 (AI 에이전트 관리)
```bash
MCP_AUTH_TOKEN=$(openssl rand -hex 32)   # Vercel 환경변수 + 로컬 .env.local에 설정
```

## 사용법

- `/admin/login` → GitHub 로그인 (본인 계정만 허용, 타 계정은 403)
- 목록: 초안/게시됨/아카이브 필터, 새 글 작성
- 에디터: Notion 스타일 — `/` 슬래시 커맨드(제목, 목록, 코드, 표, 수식, 이미지, Alert), 텍스트 선택 시 버블 메뉴, 이미지 드래그&드롭/붙여넣기 업로드
- ko/en 탭으로 두 언어를 항상 쌍으로 작성 — 게시하려면 양쪽 모두 제목+본문 필요
- `⌘S` 저장, 미리보기는 실제 블로그와 동일한 MDX 렌더링
- 게시/수정/삭제는 즉시 공개 사이트에 반영 (`revalidateTag`)

## MCP (AI 에이전트 관리)

Claude Code 같은 AI 에이전트가 블로그 전체(글·프로젝트·소개)를 관리할 수 있는 MCP 서버가 `/api/mcp`에 내장되어 있다 (Streamable HTTP + Bearer 토큰).

```bash
claude mcp add --transport http blog https://uyeon.dev/api/mcp \
  --header "Authorization: Bearer $MCP_AUTH_TOKEN"
```

- 도구: `posts_list/post_get/post_create/post_update/post_set_status/post_delete/upload_image` + `projects_*` + `about_get/about_update`
- 본문은 **마크다운**으로 읽고 쓴다 — 서버가 Tiptap JSON으로 역변환(`lib/mdx/markdown-to-tiptap.ts`) 후 admin과 동일한 파이프라인으로 컴파일하므로 에디터와 완전 호환
- `<Image …/>`, `<YouTube id/>`, `<u>`, alert, 수식, 코드 타이틀 문법이 왕복 보존된다
- 캐시 무효화는 도구가 `/api/mcp-revalidate`로 내부 요청을 보내 처리한다 (MCP 스트리밍 응답 안에서는 `revalidateTag`가 유실되기 때문 — `lib/mcp/request-context.ts` 참고)

## 구조 요약

| 항목 | 위치 |
|---|---|
| 편집 원본 | `post_translations.content_json` (Tiptap JSON) |
| 저장 시 파생 | JSON → MDX 직렬화(`lib/mdx/serialize.ts`) → mdx-bundler 컴파일(`lib/mdx/compile.ts`) → `compiled_code` |
| 공개 조회 | `lib/db/posts.ts` — `unstable_cache(tags:['posts'])` |
| 인증 | `proxy.ts` + `lib/admin/session.ts` (jose JWT 쿠키) / MCP는 `lib/mcp/auth.ts` (Bearer) |
| 프로젝트 | `projects`/`project_translations` — `lib/admin/project-service.ts`, tags:['projects'] |
| 소개(about) | `authors`/`author_translations` — techStack/timeline은 jsonb, tags:['authors'] |
| 검색/RSS/사이트맵 | `/search.json`, `/feed.xml`, `/tags/<tag>/feed.xml`, `/sitemap.xml` — 전부 DB 기반 동적 |

## 주의

- **contentlayer는 완전히 제거되었다** (2026-08). 글·프로젝트·소개 전부 DB + Vercel Blob 기반이며, `data/`에는 siteMetadata 등 설정 파일만 남는다.
- static export(`EXPORT=1`)는 더 이상 지원되지 않는다 (DB 런타임 조회 + 서버 API 필요).
- 게시된 글의 slug는 변경 불가 (URL 보호) — 초안 상태에서만 수정 가능.
