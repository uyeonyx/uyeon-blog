'use client'

// 소스에서 쓰는 아이콘을 번들에서 즉시 등록한다 — api.iconify.design 런타임 페치 제거.
// 모듈 스코프에서 1회 실행되도록 import 부수효과로 동작한다 (app/theme-providers.tsx에서 import).
// 번들에 없는 아이콘(DB 데이터 기반 등)은 기존 런타임 API 폴백으로 우아하게 저하된다.
import { addCollection } from '@iconify/react'
import { iconCollections } from '@/lib/generated/icon-bundle'

for (const collection of iconCollections) {
  addCollection(collection)
}
