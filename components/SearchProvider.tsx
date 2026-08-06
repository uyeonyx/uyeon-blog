'use client'

import { useRouter } from 'next/navigation'
import { KBarSearchProvider } from 'pliny/search/KBar'
import { useCallback, useMemo } from 'react'
import { useTagLabel } from '@/components/TagLabelsProvider'
import { useI18n } from '@/lib/i18n/i18n-context'
import { withLocale } from '@/lib/i18n/paths'
import type { CoreContent } from '@/lib/types/content'
import type { Blog } from '@/lib/types/post'

export const CustomSearchProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const { locale, t } = useI18n()
  const tagLabel = useTagLabel()

  // router.push는 components/Link을 우회하므로 여기서 직접 로케일을 붙인다
  const go = useCallback((href: string) => router.push(withLocale(href, locale)), [router, locale])

  const defaultActions = useMemo(
    () => [
      {
        id: 'homepage',
        name: t('common.home'),
        keywords: '',
        shortcut: ['h'],
        section: 'Navigate',
        perform: () => go('/'),
      },
      {
        id: 'blog',
        name: t('common.blog'),
        keywords: '',
        shortcut: ['b'],
        section: 'Navigate',
        perform: () => go('/blog'),
      },
      {
        id: 'tags',
        name: t('common.tags'),
        keywords: '',
        shortcut: ['t'],
        section: 'Navigate',
        perform: () => go('/tags'),
      },
      {
        id: 'projects',
        name: t('common.projects'),
        keywords: '',
        shortcut: ['p'],
        section: 'Navigate',
        perform: () => go('/projects'),
      },
      {
        id: 'about',
        name: t('common.about'),
        keywords: '',
        shortcut: ['a'],
        section: 'Navigate',
        perform: () => go('/about'),
      },
    ],
    [t, go]
  )

  return (
    <KBarSearchProvider
      key={locale}
      kbarConfig={{
        // 인덱스가 이미 언어별로 나뉘어 있다 — 클라이언트 필터가 필요 없다
        searchDocumentsPath: `${process.env.BASE_PATH || ''}/${locale}/search.json`,
        defaultActions,
        onSearchDocumentsLoad(json) {
          return json.map((post: CoreContent<Blog>) => ({
            id: post.path,
            name: post.title,
            keywords: post?.summary || '',
            section: t('common.blog'),
            subtitle: post.tags ? post.tags.map(tagLabel).join(', ') : '',
            perform: () => go(`/${post.path}`),
          }))
        },
      }}
    >
      {children}
    </KBarSearchProvider>
  )
}
