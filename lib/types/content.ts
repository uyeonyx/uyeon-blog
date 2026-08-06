// pliny/utils/contentlayer의 CoreContent 로컬 대체 — contentlayer 의존 제거용
export type CoreContent<T> = Omit<T, 'body' | '_id' | '_raw'>
