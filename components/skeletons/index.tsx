// loading.tsx 공용 스켈레톤 — 텍스트 없이 형태만 (i18n 불필요)

function Shimmer({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-gray-200/70 dark:bg-gray-800/70 ${className}`} />
  )
}

/** 목록형 페이지(블로그/태그) 스켈레톤 */
export function ListSkeleton() {
  return (
    <div className="space-y-6 py-8">
      <Shimmer className="h-10 w-48" />
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="space-y-4 rounded-2xl border border-gray-200/60 p-8 dark:border-gray-700/60"
          >
            <Shimmer className="aspect-2/1 w-full" />
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-8 w-3/4" />
            <Shimmer className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** 상세형 페이지(글/프로젝트) 스켈레톤 */
export function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-12">
      <Shimmer className="h-4 w-32" />
      <Shimmer className="h-12 w-5/6" />
      <div className="space-y-3 pt-8">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Shimmer key={i} className={`h-4 ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  )
}
