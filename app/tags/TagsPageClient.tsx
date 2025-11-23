'use client'

import tagData from 'app/tag-data.json'
import { motion } from 'framer-motion'
import { slug } from 'github-slugger'
import Link from '@/components/Link'
import Tag from '@/components/Tag'
import { useI18n } from '@/lib/i18n/i18n-context'

export default function TagsPageClient() {
  const { t } = useI18n()
  const tagCounts = tagData as Record<string, number>
  const tagKeys = Object.keys(tagCounts)
  const sortedTags = tagKeys.sort((a, b) => tagCounts[b] - tagCounts[a])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-start justify-start divide-y divide-gray-200 md:mt-24 md:flex-row md:items-center md:justify-center md:space-x-6 md:divide-y-0 dark:divide-gray-700"
    >
      <div className="space-x-2 pt-6 pb-8 md:space-y-5">
        <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:border-r-2 md:px-6 md:text-5xl lg:text-6xl dark:text-gray-100">
          {t('pages.tags.title')}
        </h1>
      </div>
      <div className="flex max-w-lg flex-wrap">
        {tagKeys.length === 0 && t('blog.noTagsFound')}
        {sortedTags.map((tag) => {
          return (
            <div key={tag} className="mt-2 mr-5 mb-2 flex items-center gap-2">
              <Tag text={tag} />
              <Link
                href={`/tags/${slug(tag)}`}
                className="relative z-10 text-sm font-semibold text-gray-600 uppercase dark:text-gray-300"
                aria-label={`View posts tagged ${tag}`}
              >
                ({tagCounts[tag]})
              </Link>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
