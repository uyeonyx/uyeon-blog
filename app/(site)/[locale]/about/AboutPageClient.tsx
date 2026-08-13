'use client'

import type { ReactNode } from 'react'
import IntroCard from '@/components/IntroCard'
import TechStack from '@/components/TechStack'
import Timeline from '@/components/Timeline'
import AuthorLayout from '@/layouts/AuthorLayout'
import type { Author } from '@/lib/types/author'

export default function AboutPageClient({
  author,
  children,
}: {
  author: Omit<Author, 'body'>
  /** 서버에서 렌더된 소개글 본문 (MDXServerRenderer) */
  children?: ReactNode
}) {
  const { techStack, timeline, ...content } = author

  return (
    <AuthorLayout content={content}>
      <IntroCard>{children}</IntroCard>
      {techStack.length > 0 && <TechStack categories={techStack} />}
      {timeline.length > 0 && <Timeline items={timeline} />}
    </AuthorLayout>
  )
}
