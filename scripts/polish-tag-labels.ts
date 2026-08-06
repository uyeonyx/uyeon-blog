// 태그 라벨 정비 (일회성, 멱등) — migrate-tags가 콘텐츠에서 자동 등록한 태그의 한/영 라벨을 다듬는다.
// 자동 등록분은 ko와 en이 원본 문자열로 동일하게 들어가므로, 그 상태(ko === en)인 행만 수정한다.
// → admin에서 사람이 이미 손댄 라벨(ko ≠ en)은 절대 덮어쓰지 않고, 재실행해도 안전하다.
// 실행: pnpm exec tsx scripts/polish-tag-labels.ts
import { config } from 'dotenv'

config({ path: '.env.local' })
config()

import { eq } from 'drizzle-orm'
import { getDb } from '../lib/db/client'
import { tags } from '../lib/db/schema'

// 고유명사·널리 쓰이는 약어(AWS, React, LLM, RAG, STT …)는 한/영이 같은 것이 자연스러워 목록에서 제외했다.
const LABELS: Record<string, { ko: string; en: string }> = {
  ai: { ko: 'AI', en: 'AI' },
  'ai-agent': { ko: 'AI 에이전트', en: 'AI Agent' },
  antdesign: { ko: 'Ant Design', en: 'Ant Design' },
  blockchain: { ko: '블록체인', en: 'Blockchain' },
  'case-study': { ko: '사례 연구', en: 'Case Study' },
  'chrome-extension': { ko: '크롬 확장 프로그램', en: 'Chrome Extension' },
  cryptography: { ko: '암호학', en: 'Cryptography' },
  'e2e-encryption': { ko: '종단간 암호화', en: 'E2E Encryption' },
  enterprise: { ko: '엔터프라이즈', en: 'Enterprise' },
  'knowledge-management': { ko: '지식 관리', en: 'Knowledge Management' },
  'latency-reduction': { ko: '지연 시간 개선', en: 'Latency Reduction' },
  'multi-chain': { ko: '멀티체인', en: 'Multi-chain' },
  'multi-llm': { ko: '멀티 LLM', en: 'Multi-LLM' },
  'multimodal-ai': { ko: '멀티모달 AI', en: 'Multimodal AI' },
  palantir: { ko: '팔란티어', en: 'Palantir' },
  'performance-optimization': { ko: '성능 최적화', en: 'Performance Optimization' },
  'real-time-ai': { ko: '실시간 AI', en: 'Real-time AI' },
  'software-architecture': { ko: '소프트웨어 아키텍처', en: 'Software Architecture' },
  'voice-interface': { ko: '음성 인터페이스', en: 'Voice Interface' },
  'web3-wallet': { ko: 'Web3 지갑', en: 'Web3 Wallet' },
}

// 스크립트는 Next 밖에서 도니 revalidateTag를 호출할 수 없다 (admin UI 경유 수정은 자동 무효화됨)
const REVALIDATE_NOTE =
  '이미 뜬 서버는 캐시가 남아 있으니 배포하거나, POST /api/mcp-revalidate 로 {"tags":["tags"]}를 무효화하세요.'

async function main() {
  const db = getDb()
  const rows = await db.select().from(tags)

  const updated: string[] = []
  const skipped: string[] = []
  for (const row of rows) {
    const target = LABELS[row.slug]
    if (!target) continue
    if (row.labelKo === target.ko && row.labelEn === target.en) continue
    // ko ≠ en 이면 이미 사람이 다듬은 라벨 — 건드리지 않는다
    if (row.labelKo !== row.labelEn) {
      skipped.push(`${row.slug} (현재: ${row.labelKo} / ${row.labelEn})`)
      continue
    }
    await db
      .update(tags)
      .set({ labelKo: target.ko, labelEn: target.en, updatedAt: new Date() })
      .where(eq(tags.slug, row.slug))
    updated.push(`${row.slug}: ${target.ko} / ${target.en}`)
  }

  console.log(`수정 ${updated.length}건`)
  for (const u of updated) console.log(`  ${u}`)
  if (skipped.length > 0) {
    console.log(`\n수동 편집분이라 건너뜀 ${skipped.length}건`)
    for (const s of skipped) console.log(`  ${s}`)
  }
  if (updated.length > 0) console.log(`\n${REVALIDATE_NOTE}`)
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e)
    process.exit(1)
  }
)
