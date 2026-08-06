'use client'

import { MDXLayoutRenderer } from 'pliny/mdx-components'
import IntroCard from '@/components/IntroCard'
import { components } from '@/components/MDXComponents'
import TechStack from '@/components/TechStack'
import Timeline from '@/components/Timeline'
import AuthorLayout from '@/layouts/AuthorLayout'
import { useI18n } from '@/lib/i18n/i18n-context'
import type { Author } from '@/lib/types/author'

export default function AboutPageClient({ authors }: { authors: Author[] }) {
  const { locale } = useI18n()

  // 현재 언어 우선, 없으면 영어 폴백
  const selectedAuthor =
    authors.find((a) => a.language === locale) ??
    authors.find((a) => a.language === 'en') ??
    authors[0]

  if (!selectedAuthor) return null

  const { techStack, timeline, body, ...content } = selectedAuthor

  return (
    <AuthorLayout content={content}>
      <IntroCard>
        {body.code && <MDXLayoutRenderer code={body.code} components={components} />}
      </IntroCard>
      {techStack.length > 0 && <TechStack categories={techStack} />}
      {timeline.length > 0 && <Timeline items={timeline} />}
    </AuthorLayout>
  )
}
