'use client'

import { Comments as CommentsComponent } from 'pliny/comments'
import { useTheme } from 'next-themes'
import { useMemo } from 'react'
import siteMetadata from '@/data/siteMetadata'
import { useI18n } from '@/lib/i18n/i18n-context'

export default function Comments({ slug }: { slug: string }) {
  const { locale } = useI18n()
  const { resolvedTheme } = useTheme()

  // 동적으로 댓글 설정 생성
  const commentsConfig = useMemo(() => {
    if (!siteMetadata.comments?.provider) {
      return null
    }

    // Giscus 설정을 동적으로 업데이트
    if (siteMetadata.comments.provider === 'giscus' && siteMetadata.comments.giscusConfig) {
      return {
        ...siteMetadata.comments,
        giscusConfig: {
          ...siteMetadata.comments.giscusConfig,
          lang: locale, // 현재 언어로 변경 (ko 또는 en)
          theme: resolvedTheme === 'dark' ? 'transparent_dark' : 'light', // 현재 테마에 맞춰 변경
          darkTheme: 'transparent_dark', // 다크 모드 테마
        },
      }
    }

    return siteMetadata.comments
  }, [locale, resolvedTheme])

  if (!commentsConfig) {
    return null
  }

  return <CommentsComponent commentsConfig={commentsConfig} slug={slug} />
}
