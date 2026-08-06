'use client'

import { type Authors, allAuthors } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { coreContent } from 'pliny/utils/contentlayer'
import { components } from '@/components/MDXComponents'
import AuthorLayout from '@/layouts/AuthorLayout'
import { useI18n } from '@/lib/i18n/i18n-context'

export default function AboutPageClient() {
  const { locale } = useI18n()

  // 현재 언어에 맞는 작성자 찾기
  const author = allAuthors.find((p) => p.slug === 'default' && p.language === locale) as Authors

  // 언어별 파일이 없으면 영어 버전을 기본으로 사용
  const fallbackAuthor = allAuthors.find(
    (p) => p.slug === 'default' && p.language === 'en'
  ) as Authors

  const selectedAuthor = author || fallbackAuthor
  const mainContent = coreContent(selectedAuthor)

  return (
    <AuthorLayout content={mainContent}>
      <MDXLayoutRenderer code={selectedAuthor.body.code} components={components} />
    </AuthorLayout>
  )
}
