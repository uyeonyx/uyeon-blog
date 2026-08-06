'use client'

import { MDXLayoutRenderer } from 'pliny/mdx-components'
import IntroCard from '@/components/IntroCard'
import { components } from '@/components/MDXComponents'
import TechStack from '@/components/TechStack'
import Timeline from '@/components/Timeline'
import AuthorLayout from '@/layouts/AuthorLayout'
import type { Author } from '@/lib/types/author'

export default function AboutPageClient({ author }: { author: Author }) {
  const { techStack, timeline, body, ...content } = author

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
