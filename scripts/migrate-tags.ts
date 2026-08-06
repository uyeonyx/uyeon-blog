// 태그 마스터 백필 — 멱등(재실행 시 no-op).
// 0) tags 테이블 생성 (IF NOT EXISTS — drizzle-kit push가 기존 DB 드리프트 프롬프트에 걸려 자체 수행)
// 1) 구 tag-translations.json 내용(아래 내장 사본)을 tags 마스터에 upsert
// 2) posts/projects의 tags 배열을 canonical slug로 정규화, 미등록 태그는 원본 라벨로 등록
// 실행: pnpm exec tsx scripts/migrate-tags.ts
import { config } from 'dotenv'

config({ path: '.env.local' })
config()

import { eq, inArray, sql } from 'drizzle-orm'
import { slug as slugify } from 'github-slugger'
import { getDb } from '../lib/db/client'
import { posts, projects, tags } from '../lib/db/schema'

// lib/i18n/locales/tag-translations.json의 사본 — 원본 파일은 이 마이그레이션 이후 삭제됨
const SEED_TRANSLATIONS: Record<string, { en: string; ko: string }> = {
  welcome: { en: 'Welcome', ko: '환영' },
  introduction: { en: 'Introduction', ko: '소개' },
  nextjs: { en: 'Next.js', ko: 'Next.js' },
  'web-development': { en: 'Web Development', ko: '웹개발' },
  react: { en: 'React', ko: 'React' },
  'generative-ai': { en: 'Generative AI', ko: '생성형 AI' },
  'cognitive-debt': { en: 'Cognitive Debt', ko: '인지적 부채' },
  'automation-bias': { en: 'Automation Bias', ko: '자동화 편향' },
  'software-engineering': { en: 'Software Engineering', ko: '소프트웨어 엔지니어링' },
  'human-in-the-loop': { en: 'Human-in-the-Loop', ko: '휴먼-인-더-루프' },
  google: { en: 'Google', ko: '구글' },
  'vertical-integration': { en: 'Vertical Integration', ko: '수직적 통합' },
  'engineering-culture': { en: 'Engineering Culture', ko: '엔지니어링 문화' },
  'business-model': { en: 'Business Model', ko: '비즈니스 모델' },
}

async function main() {
  const db = getDb()

  // 0) 테이블 생성 (lib/db/schema.ts의 tags 정의와 동일)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "tags" (
      "slug" text PRIMARY KEY,
      "label_ko" text NOT NULL,
      "label_en" text NOT NULL,
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `)

  // 1) 번역 seed upsert
  const seedRows = Object.entries(SEED_TRANSLATIONS).map(([slug, labels]) => ({
    slug,
    labelKo: labels.ko,
    labelEn: labels.en,
  }))
  const beforeSeed = await db
    .select({ slug: tags.slug })
    .from(tags)
    .where(
      inArray(
        tags.slug,
        seedRows.map((r) => r.slug)
      )
    )
  await db.insert(tags).values(seedRows).onConflictDoNothing()
  const seededCount = seedRows.length - beforeSeed.length

  // 2) 콘텐츠 태그 정규화 + 미등록 태그 등록
  let registeredCount = 0
  let updatedRows = 0

  const normalizeRows = async (
    rows: { id: string; tags: string[] }[],
    updateRow: (id: string, next: string[]) => Promise<void>
  ) => {
    for (const row of rows) {
      const next: string[] = []
      const labels: Record<string, string> = {}
      for (const raw of row.tags) {
        const s = slugify(raw.trim())
        if (!s || next.includes(s)) continue
        next.push(s)
        labels[s] = raw.trim()
      }

      // 미등록 slug는 원본 문자열을 라벨로 등록
      const existing = next.length
        ? await db.select({ slug: tags.slug }).from(tags).where(inArray(tags.slug, next))
        : []
      const known = new Set(existing.map((e) => e.slug))
      const missing = next.filter((s) => !known.has(s))
      if (missing.length > 0) {
        await db
          .insert(tags)
          .values(missing.map((s) => ({ slug: s, labelKo: labels[s], labelEn: labels[s] })))
          .onConflictDoNothing()
        registeredCount += missing.length
      }

      if (JSON.stringify(next) !== JSON.stringify(row.tags)) {
        await updateRow(row.id, next)
        updatedRows++
      }
    }
  }

  const postRows = await db.select({ id: posts.id, tags: posts.tags }).from(posts)
  await normalizeRows(postRows, async (id, next) => {
    await db.update(posts).set({ tags: next }).where(eq(posts.id, id))
  })

  const projectRows = await db.select({ id: projects.id, tags: projects.tags }).from(projects)
  await normalizeRows(projectRows, async (id, next) => {
    await db.update(projects).set({ tags: next }).where(eq(projects.id, id))
  })

  const total = await db.select({ slug: tags.slug }).from(tags)
  console.log(
    [
      `seed 신규 등록: ${seededCount}`,
      `콘텐츠에서 발견해 등록: ${registeredCount}`,
      `정규화로 수정된 행: ${updatedRows} (posts ${postRows.length}, projects ${projectRows.length} 스캔)`,
      `태그 마스터 총 ${total.length}개`,
      // 스크립트는 Next 밖에서 도니 revalidateTag를 호출할 수 없다 (admin UI 경유 수정은 자동 무효화됨)
      '이미 뜬 서버는 캐시가 남아 있으니 배포하거나, POST /api/mcp-revalidate 로 {"tags":["posts","projects","tags"]}를 무효화하세요.',
    ].join('\n')
  )
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e)
    process.exit(1)
  }
)
