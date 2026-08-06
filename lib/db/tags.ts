// 공개 페이지용 태그 마스터 조회 — 'tags' 태그로 캐시되고, 태그 mutation 시 revalidateTag('tags')로 무효화된다.
import { unstable_cache } from 'next/cache'
import type { Locale } from '@/lib/i18n/config'
import { getDb } from './client'
import { tags } from './schema'

export interface TagLabelPair {
  ko: string
  en: string
}

export const loadTagMaster = unstable_cache(
  async () => {
    const db = getDb()
    return db.select().from(tags)
  },
  ['tag-master'],
  { tags: ['tags'] }
)

/** slug → 언어별 라벨 맵. 표시 계층은 없는 slug를 원본 문자열로 fallback한다. */
export async function getTagLabels(): Promise<Record<string, TagLabelPair>> {
  const rows = await loadTagMaster()
  return Object.fromEntries(rows.map((r) => [r.slug, { ko: r.labelKo, en: r.labelEn }]))
}

/** slug → 해당 언어의 표시 라벨 (서버에서 언어를 확정해 내려보낼 때) */
export async function getTagLabelMap(language: Locale): Promise<Record<string, string>> {
  const rows = await loadTagMaster()
  return Object.fromEntries(rows.map((r) => [r.slug, language === 'ko' ? r.labelKo : r.labelEn]))
}

/** 태그 페이지 제목 — 마스터에 없으면 slug를 사람이 읽을 형태로 폴백 */
export async function getTagTitle(tag: string, language: Locale): Promise<string> {
  const labels = await getTagLabelMap(language)
  return labels[tag] ?? tag[0].toUpperCase() + tag.split(' ').join('-').slice(1)
}
