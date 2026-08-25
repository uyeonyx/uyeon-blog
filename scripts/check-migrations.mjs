// 커밋된 마이그레이션과 DB에 실제로 적용된 것을 대조한다.
//
// 규칙은 무중단 배포의 불변식 하나에서 나온다:
//   "스키마는 항상 현재 돌고 있는 모든 코드 버전이 필요로 하는 것의 합집합이어야 한다."
//   → 가산(expand)은 배포보다 **먼저**, 파괴(contract)는 배포보다 **나중**.
//
//   미적용 가산   → 실패. 신코드가 없는 컬럼을 읽게 된다.
//   미적용 파괴   → 경고. 배포 후에 적용하는 것이 정상이므로 막지 않고 알리기만 한다.
//   해시 불일치   → 실패. 커밋된 마이그레이션은 append-only인데 수정됐다는 뜻.
//
// DATABASE_URL이 없으면 아무것도 하지 않고 성공으로 끝난다 (시크릿 미설정 환경).
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const MIGRATIONS_DIR = 'drizzle'

// 구버전 코드가 여전히 참조할 수 있는 것을 없애는 구문 = 배포 이후에 적용해야 하는 것
const DESTRUCTIVE = [
  /\bDROP\s+COLUMN\b/i,
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+CONSTRAINT\b/i,
  /\bDROP\s+TYPE\b/i,
  /\bDROP\s+INDEX\b/i,
  /\bRENAME\s+(COLUMN|TO)\b/i,
  /\bSET\s+NOT\s+NULL\b/i,
]

const gh = (level, message) =>
  console.log(process.env.GITHUB_ACTIONS ? `::${level}::${message}` : `[${level}] ${message}`)

const url = process.env.DATABASE_URL
if (!url) {
  gh('notice', 'DATABASE_URL 시크릿이 없어 마이그레이션 대조를 건너뜁니다')
  process.exit(0)
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((name) => {
    const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8')
    return {
      name,
      sql,
      hash: createHash('sha256').update(sql).digest('hex'),
      destructive: DESTRUCTIVE.some((re) => re.test(sql)),
    }
  })

// Railway Postgres는 자체서명 인증서 체인이라 CA 검증을 켜면 붙지 못한다 (lib/db/client.ts와 동일 판단).
// URL에 sslmode가 있으면 pg가 그쪽을 우선해 아래 옵션을 무시하므로 미리 떼어낸다.
const connectionString = url.replace(/([?&])sslmode=[^&]*&?/g, '$1').replace(/[?&]$/, '')
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()

let applied = []
try {
  const res = await client.query(
    'select hash from drizzle.__drizzle_migrations order by created_at'
  )
  applied = res.rows.map((r) => r.hash)
} catch (e) {
  // 테이블이 아직 없으면 전부 미적용으로 본다
  if (!/does not exist/i.test(e.message)) throw e
  gh('notice', '__drizzle_migrations 테이블이 없습니다 — 전부 미적용으로 간주합니다')
}
await client.end()

// 적용분은 파일 목록의 앞부분과 정확히 일치해야 한다 (append-only)
let diverged = false
for (let i = 0; i < applied.length; i++) {
  if (!files[i]) {
    gh('error', `DB에 적용된 마이그레이션 ${applied[i]}에 해당하는 파일이 저장소에 없습니다`)
    diverged = true
  } else if (files[i].hash !== applied[i]) {
    gh(
      'error',
      `${files[i].name}의 내용이 적용 당시와 다릅니다 — 마이그레이션은 append-only입니다. 되돌리려면 새 마이그레이션을 앞으로 추가하세요`
    )
    diverged = true
  }
}

const pending = files.slice(applied.length)
const pendingAdditive = pending.filter((f) => !f.destructive)
const pendingDestructive = pending.filter((f) => f.destructive)

console.log(`커밋된 마이그레이션 ${files.length}건 / DB 적용 ${applied.length}건`)

for (const f of pendingDestructive) {
  gh(
    'warning',
    `미적용(파괴적): ${f.name} — 배포가 끝난 뒤 'pnpm db:migrate'로 적용하세요. 배포 전에 돌리면 구버전 인스턴스가 500을 냅니다`
  )
}
for (const f of pendingAdditive) {
  gh(
    'error',
    `미적용(가산): ${f.name} — 이 스키마를 쓰는 코드가 배포되기 전에 'pnpm db:migrate'로 적용해야 합니다`
  )
}

if (pending.length === 0 && !diverged) console.log('모든 마이그레이션이 적용되어 있습니다')

process.exit(diverged || pendingAdditive.length > 0 ? 1 : 0)
