'use client'

import { useRouter } from 'next/navigation'
import { KBarSearchProvider } from 'pliny/search/KBar'
import { useMemo } from 'react'
import { useTagLabel } from '@/components/TagLabelsProvider'
import { useI18n } from '@/lib/i18n/i18n-context'
import type { CoreContent } from '@/lib/types/content'
import type { Blog } from '@/lib/types/post'

export const CustomSearchProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const { locale, t } = useI18n()
  const tagLabel = useTagLabel()

  const defaultActions = useMemo(
    () => [
      {
        id: 'homepage',
        name: t('common.home'),
        keywords: '',
        shortcut: ['h'],
        section: 'Navigate',
        perform: () => router.push('/'),
      },
      {
        id: 'blog',
        name: t('common.blog'),
        keywords: '',
        shortcut: ['b'],
        section: 'Navigate',
        perform: () => router.push('/blog'),
      },
      {
        id: 'tags',
        name: t('common.tags'),
        keywords: '',
        shortcut: ['t'],
        section: 'Navigate',
        perform: () => router.push('/tags'),
      },
      {
        id: 'projects',
        name: t('common.projects'),
        keywords: '',
        shortcut: ['p'],
        section: 'Navigate',
        perform: () => router.push('/projects'),
      },
      {
        id: 'about',
        name: t('common.about'),
        keywords: '',
        shortcut: ['a'],
        section: 'Navigate',
        perform: () => router.push('/about'),
      },
    ],
    [t, router]
  )

  return (
    <KBarSearchProvider
      key={locale}
      kbarConfig={{
        searchDocumentsPath: `${process.env.BASE_PATH || ''}/search.json`,
        defaultActions,
        onSearchDocumentsLoad(json) {
          // 현재 언어에 맞는 포스트만 필터링
          return json
            .filter((post: CoreContent<Blog>) => {
              // language 필드가 없으면 모든 언어에서 표시
              if (!post.language) return true
              // language 필드가 있으면 현재 locale과 일치하는 것만 표시
              return post.language === locale
            })
            .map((post: CoreContent<Blog>) => ({
              id: post.path,
              name: post.title,
              keywords: post?.summary || '',
              section: t('common.blog'),
              subtitle: post.tags ? post.tags.map(tagLabel).join(', ') : '',
              perform: () => router.push(`/${post.path}`),
            }))
        },
      }}
    >
      {children}
    </KBarSearchProvider>
  )
}
