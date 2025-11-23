'use client'

import type { Blog } from 'contentlayer/generated'
import { motion } from 'framer-motion'
import NextImage from 'next/image'
import Bleed from 'pliny/ui/Bleed'
import type { CoreContent } from 'pliny/utils/contentlayer'
import type { ReactNode } from 'react'
import Link from '@/components/Link'
import PageTitle from '@/components/PageTitle'
import ScrollTopAndComment from '@/components/ScrollTopAndComment'
import SectionContainer from '@/components/SectionContainer'
import { useI18n } from '@/lib/i18n/i18n-context'

interface LayoutProps {
  content: CoreContent<Blog>
  children: ReactNode
  next?: { path: string; title: string }
  prev?: { path: string; title: string }
}

export default function PostMinimal({ content, next, prev, children }: LayoutProps) {
  const { title, images } = content
  const { t } = useI18n()
  const displayImage =
    images && images.length > 0 ? images[0] : 'https://picsum.photos/seed/picsum/800/400'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SectionContainer>
        <ScrollTopAndComment />
        <article>
          <div>
            <div className="space-y-1 pb-10 text-center dark:border-gray-700">
              <div className="w-full">
                <Bleed>
                  <div className="relative aspect-2/1 w-full">
                    <NextImage src={displayImage} alt={title} fill className="object-cover" />
                  </div>
                </Bleed>
              </div>
              <div className="relative pt-10">
                <PageTitle>{title}</PageTitle>
              </div>
            </div>
            <div className="prose dark:prose-invert max-w-none py-4">{children}</div>
            <footer>
              <div className="flex flex-col text-sm font-medium sm:flex-row sm:justify-between sm:text-base">
                {prev?.path && (
                  <div className="pt-4 xl:pt-8">
                    <Link
                      href={`/${prev.path}`}
                      className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                      aria-label={`${t('blog.previousPost')}: ${prev.title}`}
                    >
                      &larr; {prev.title}
                    </Link>
                  </div>
                )}
                {next?.path && (
                  <div className="pt-4 xl:pt-8">
                    <Link
                      href={`/${next.path}`}
                      className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                      aria-label={`${t('blog.nextPost')}: ${next.title}`}
                    >
                      {next.title} &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </footer>
          </div>
        </article>
      </SectionContainer>
    </motion.div>
  )
}
