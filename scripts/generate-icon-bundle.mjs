// 소스에서 쓰는 Iconify 아이콘만 추린 오프라인 번들을 생성한다.
// 전체 컬렉션(@iconify-json/solar 6MB+)을 번들에 넣을 수는 없으므로 사용분만 codegen.
// 실행: node scripts/generate-icon-bundle.mjs (pnpm dev/build 앞단에서 자동 실행)
//
// DB 데이터(techStack 등)에서 오는 아이콘 이름은 정적으로 열거할 수 없다 — 그런 아이콘은
// 기존처럼 api.iconify.design 런타임 폴백으로 로드된다 (누락 = 깨짐이 아니라 지연).
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getIcons } from '@iconify/utils'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const COLLECTIONS = ['solar', 'mdi']
const SCAN_DIRS = ['app', 'components', 'layouts', 'lib']

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === 'generated') continue
      yield* walk(path)
    } else if (/\.(tsx?|jsx?)$/.test(name)) {
      yield path
    }
  }
}

const used = new Map(COLLECTIONS.map((c) => [c, new Set()]))
const pattern = new RegExp(`['"\`](${COLLECTIONS.join('|')}):([a-z0-9-]+)['"\`]`, 'g')
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(root, dir))) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(pattern)) {
      used.get(match[1]).add(match[2])
    }
  }
}

const bundles = []
for (const collection of COLLECTIONS) {
  const names = [...used.get(collection)].sort()
  if (names.length === 0) continue
  const full = JSON.parse(
    readFileSync(join(root, 'node_modules', `@iconify-json/${collection}/icons.json`), 'utf8')
  )
  const subset = getIcons(full, names)
  const missing = names.filter((n) => !subset?.icons?.[n] && !subset?.aliases?.[n])
  if (missing.length > 0) {
    console.warn(`[icon-bundle] ${collection}에 없는 아이콘 (런타임 폴백): ${missing.join(', ')}`)
  }
  bundles.push(subset)
}

const outDir = join(root, 'lib', 'generated')
mkdirSync(outDir, { recursive: true })
const counts = bundles.map((b) => `${b.prefix}:${Object.keys(b.icons).length}`).join(', ')
writeFileSync(
  join(outDir, 'icon-bundle.ts'),
  `// 자동 생성 — 수정 금지. scripts/generate-icon-bundle.mjs가 만든다 (${counts})
import type { IconifyJSON } from '@iconify/react'

export const iconCollections: IconifyJSON[] = ${JSON.stringify(bundles)}
`
)
console.log(`[icon-bundle] generated: ${counts}`)
