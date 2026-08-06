import type { MetadataRoute } from 'next'
import { getAuthor } from '@/lib/db/authors'
import { getAllCores, getTagCounts } from '@/lib/db/posts'
import { getAllProjects } from '@/lib/db/projects'
import { isLocale, LOCALES, type Locale } from '@/lib/i18n/config'
import { hreflangMap, localeUrl, postImageUrl } from '@/lib/seo/urls'
import type { PostCore } from '@/lib/types/post'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

/**
 * lastmod는 관리자가 수동으로 넣는 nullable 컬럼이라 거의 항상 발행일과 같다.
 * 실제 수정 시각인 updatedAt을 우선한다 — Google은 lastmod가 부정확하면 사이트 전체의 lastmod를 무시한다.
 */
function lastModOf(post: PostCore): string {
  return post.lastmod ?? post.updatedAt ?? post.date
}

function entry(
  locale: Locale,
  seg: string,
  options: {
    available?: readonly Locale[]
    lastModified?: string
    changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']
    priority?: number
    images?: string[]
  } = {}
): MetadataRoute.Sitemap[number] {
  const { available = LOCALES, ...rest } = options
  return {
    url: localeUrl(locale, seg),
    ...rest,
    alternates: { languages: hreflangMap(seg, available) },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cores, projects] = await Promise.all([getAllCores(), getAllProjects()])

  // slug → 실제로 존재하는 언어 (한쪽 언어만 있는 글은 그 언어 URL만 싣는다)
  const bySlug = new Map<string, { locales: Locale[]; posts: Map<Locale, PostCore> }>()
  for (const post of cores) {
    if (!isLocale(post.language)) continue
    const item = bySlug.get(post.slug) ?? {
      locales: [] as Locale[],
      posts: new Map<Locale, PostCore>(),
    }
    item.locales.push(post.language)
    item.posts.set(post.language, post)
    bySlug.set(post.slug, item)
  }

  const newestPost = cores.reduce<string | undefined>((acc, p) => {
    const mod = lastModOf(p)
    return !acc || mod > acc ? mod : acc
  }, undefined)

  const projectsLastMod = projects.reduce<string | undefined>((acc, p) => {
    return !acc || (p.updatedAt && p.updatedAt > acc) ? (p.updatedAt ?? acc) : acc
  }, undefined)

  const entries: MetadataRoute.Sitemap = []

  for (const locale of LOCALES) {
    const [tagCounts, author] = await Promise.all([getTagCounts(locale), getAuthor(locale)])

    entries.push(
      entry(locale, '', {
        lastModified: newestPost,
        changeFrequency: 'daily',
        priority: 1,
      }),
      entry(locale, 'blog', {
        lastModified: newestPost,
        changeFrequency: 'daily',
        priority: 0.9,
      }),
      entry(locale, 'tags', {
        lastModified: newestPost,
        changeFrequency: 'weekly',
        priority: 0.5,
      }),
      entry(locale, 'projects', {
        lastModified: projectsLastMod,
        changeFrequency: 'monthly',
        priority: 0.7,
      }),
      entry(locale, 'about', {
        lastModified: author?.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.7,
      }),
      // /ai는 정적 안내 페이지라 정확한 수정 시각이 없다 — 거짓 lastmod보다 생략이 낫다
      entry(locale, 'ai', { changeFrequency: 'monthly', priority: 0.4 })
    )

    for (const tagSlug of Object.keys(tagCounts)) {
      entries.push(
        entry(locale, `tags/${tagSlug}`, {
          lastModified: newestPost,
          changeFrequency: 'weekly',
          priority: 0.5,
        })
      )
    }

    for (const [slug, { locales, posts }] of bySlug) {
      const post = posts.get(locale)
      if (!post) continue
      entries.push(
        entry(locale, `blog/${slug}`, {
          available: locales,
          lastModified: lastModOf(post),
          changeFrequency: 'monthly',
          priority: 0.8,
          images: [postImageUrl(post, locale)],
        })
      )
    }
  }

  return entries
}
