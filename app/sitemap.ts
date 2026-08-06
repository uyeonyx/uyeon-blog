import type { MetadataRoute } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { getPublishedCores } from '@/lib/db/posts'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = siteMetadata.siteUrl

  const cores = await getPublishedCores()
  const seen = new Set<string>()
  const blogRoutes: MetadataRoute.Sitemap = []
  for (const post of cores) {
    if (seen.has(post.slug)) continue
    seen.add(post.slug)
    blogRoutes.push({
      url: `${siteUrl}/${post.path}`,
      lastModified: post.lastmod || post.date,
    })
  }

  const routes = ['', 'blog', 'projects', 'tags'].map((route) => ({
    url: `${siteUrl}/${route}`,
    lastModified: new Date().toISOString().split('T')[0],
  }))

  return [...routes, ...blogRoutes]
}
