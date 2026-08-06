import siteMetadata from '@/data/siteMetadata'
import { BCP47, type Locale } from '@/lib/i18n/config'
import type { AuthorCore } from '@/lib/types/author'
import type { PostCore } from '@/lib/types/post'
import { absoluteUrl, localeUrl, postImageUrl } from './urls'

const PERSON_ID = `${siteMetadata.siteUrl}/#person`
const ORG_ID = `${siteMetadata.siteUrl}/#organization`
const SITE_ID = `${siteMetadata.siteUrl}/#website`

/** Google이 110자 초과 headline을 경고한다 */
function clampHeadline(title: string): string {
  return title.length <= 110 ? title : `${title.slice(0, 107)}...`
}

function personNode(author: AuthorCore | null, locale: Locale) {
  const sameAs = [author?.github, author?.linkedin, author?.twitter, author?.bluesky].filter(
    (v): v is string => Boolean(v)
  )
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: author?.name ?? siteMetadata.author,
    url: localeUrl(locale, 'about'),
    ...(author?.occupation ? { jobTitle: author.occupation } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  }
}

function organizationNode() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: siteMetadata.title,
    url: siteMetadata.siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(siteMetadata.siteLogo),
    },
  }
}

export function blogPostingJsonLd({
  post,
  locale,
  author,
  canonical,
}: {
  post: PostCore
  locale: Locale
  author: AuthorCore | null
  canonical: string
}) {
  const modified = post.lastmod ?? post.updatedAt ?? post.date
  const image = postImageUrl(post, locale)

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonical}#article`,
    headline: clampHeadline(post.title),
    ...(post.summary ? { description: post.summary } : {}),
    inLanguage: BCP47[locale],
    datePublished: post.date,
    dateModified: modified,
    url: canonical,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    image: { '@type': 'ImageObject', url: image, width: 1200, height: 630 },
    author: personNode(author, locale),
    publisher: organizationNode(),
    ...(post.tags.length > 0 ? { keywords: post.tags } : {}),
    ...(post.readingTime?.words ? { wordCount: post.readingTime.words } : {}),
    ...(post.readingTime?.minutes
      ? { timeRequired: `PT${Math.max(1, Math.ceil(post.readingTime.minutes))}M` }
      : {}),
  }
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * 홈에 싣는 엔티티 그래프. Person/Organization을 @id로 한 번만 정의하고
 * 모든 글의 JSON-LD가 그것을 참조한다.
 */
export function siteGraphJsonLd(locale: Locale, author: AuthorCore | null, description: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': SITE_ID,
        url: localeUrl(locale),
        name: siteMetadata.title,
        description,
        inLanguage: BCP47[locale],
        publisher: { '@id': ORG_ID },
      },
      organizationNode(),
      personNode(author, locale),
    ],
  }
}

export function profilePageJsonLd(locale: Locale, author: AuthorCore | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${localeUrl(locale, 'about')}#profile`,
    url: localeUrl(locale, 'about'),
    inLanguage: BCP47[locale],
    mainEntity: personNode(author, locale),
  }
}
