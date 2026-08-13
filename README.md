# uyeon.dev

![banner](/public/static/images/og-banner.png)

개인 기술 블로그. [tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog)에서 출발했지만, 콘텐츠 계층을 파일(MDX)에서 DB로 완전히 옮기고 i18n·댓글·관리자 모드·MCP를 자체 구현하면서 사실상 별개의 코드베이스가 되었다.

## 아키텍처

- **Next.js 16 (App Router)** — 공개 라우트는 전부 `/ko`, `/en` 로케일 접두사 아래. 페이지는 ISR(요청 시 렌더 후 캐시)이고, 데이터는 `unstable_cache` + `revalidateTag`로 mutation 즉시 무효화된다.
- **콘텐츠는 전부 Railway Postgres (Drizzle)** — 글/프로젝트/소개가 `content_json`(Tiptap) → MDX 직렬화 → `mdx-bundler` 컴파일 파이프라인을 거쳐 저장된다. 이미지는 Vercel Blob. 스키마 변경은 `drizzle/` 마이그레이션으로 관리한다.
- **관리자 모드 `/admin`** — GitHub OAuth(단일 계정), Notion 스타일 Tiptap 에디터, 저장 즉시 공개 반영.
- **자체 댓글** — 익명(PoW 챌린지 + HMAC 신원) / GitHub 로그인, 서버 판정 권한, soft delete.
- **MCP 서버 내장** — `/mcp`(공개 read-only, 무인증)와 `/api/mcp`(관리, Bearer/OAuth). AI 에이전트가 글을 읽고 쓸 수 있다.

## 문서

| 문서 | 내용 |
|---|---|
| [AGENTS.md](AGENTS.md) | 저장소 규약 — 라우팅/데이터/SEO 컨벤션 (AI 에이전트·사람 공용) |
| [ADMIN_SETUP.md](ADMIN_SETUP.md) | 관리자 모드 설정: DB/Blob/OAuth/시크릿, MCP 연결 |
| [I18N_GUIDE.md](I18N_GUIDE.md) | 로케일 라우팅 구조와 규칙 |

## 개발

```bash
pnpm install
cp .env.example .env.local   # 값 채우기 — ADMIN_SETUP.md 참고
pnpm dev                     # prepare-assets(아이콘 번들·katex 복사) 후 next dev
pnpm build                   # 프리렌더가 DB를 읽는다 — DATABASE_URL 필요
pnpm lint && pnpm typecheck
```

DB 마이그레이션: `pnpm db:generate`(스키마 변경 → SQL 생성) → 커밋 → 배포 후 `pnpm db:migrate`. 자세한 규칙은 AGENTS.md.

## 라이선스

[MIT](LICENSE) — 원 템플릿 저작권 고지는 LICENSE 파일에 유지한다.
