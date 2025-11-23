'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/i18n-context'

interface TimelineItem {
  period: string
  title: string
  company: string
  description: string
  link?: string
}

interface TimelineProps {
  items: TimelineItem[]
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function Timeline({ items }: TimelineProps) {
  const { t } = useI18n()

  return (
    <motion.div className="mt-12 not-prose" variants={container} initial="hidden" animate="show">
      <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Icon icon="mdi:timeline-clock-outline" className="text-3xl text-primary-500" />
        {t('pages.about.timeline')}
      </h2>

      <div className="relative">
        {/* Center Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-linear-to-b from-primary-500/20 via-primary-500/50 to-primary-500/20 hidden md:block" />

        <div className="space-y-6">
          {items.map((timelineItem, index) => {
            const isLeft = index % 2 === 0

            return (
              <motion.div
                key={`${timelineItem.company}-${timelineItem.period}`}
                variants={item}
                className="relative"
              >
                {/* Mobile/Tablet Layout (Stacked) */}
                <div className="md:hidden">
                  <div className="flex gap-3">
                    {/* Left side - Period with icon */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-500/10 border-2 border-primary-500">
                        <Icon icon="mdi:briefcase-outline" className="text-sm text-primary-500" />
                      </div>
                      <div className="w-0.5 flex-1 bg-linear-to-b from-primary-500/50 to-transparent mt-2" />
                    </div>

                    {/* Right side - Content */}
                    <div className="flex-1 pb-4">
                      <div className="mb-1">
                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                          {timelineItem.period}
                        </span>
                      </div>
                      <div
                        className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/10 dark:hover:shadow-primary-500/10"
                        style={{
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
                        }}
                      >
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                          {timelineItem.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                            {timelineItem.company}
                          </span>
                          {timelineItem.link && (
                            <a
                              href={timelineItem.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-primary-500 transition-colors"
                            >
                              <Icon icon="mdi:open-in-new" className="text-xs" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          {timelineItem.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout (Left-Right Alternating) */}
                <div className="hidden md:grid md:grid-cols-2 md:gap-6">
                  {isLeft ? (
                    <>
                      {/* Left Content */}
                      <div className="text-right pr-6">
                        <div className="mb-1">
                          <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                            {timelineItem.period}
                          </span>
                        </div>
                        <div
                          className="inline-block text-left rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/10 dark:hover:shadow-primary-500/10"
                          style={{
                            boxShadow:
                              '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
                          }}
                        >
                          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                            {timelineItem.title}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                              {timelineItem.company}
                            </span>
                            {timelineItem.link && (
                              <a
                                href={timelineItem.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-primary-500 transition-colors"
                              >
                                <Icon icon="mdi:open-in-new" className="text-xs" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            {timelineItem.description}
                          </p>
                        </div>
                      </div>

                      {/* Center Icon */}
                      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-primary-500/10 border-4 border-white dark:border-gray-950 shadow-lg">
                        <Icon icon="mdi:briefcase-outline" className="text-lg text-primary-500" />
                      </div>

                      {/* Right Empty */}
                      <div />
                    </>
                  ) : (
                    <>
                      {/* Left Empty */}
                      <div />

                      {/* Center Icon */}
                      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-primary-500/10 border-4 border-white dark:border-gray-950 shadow-lg">
                        <Icon icon="mdi:briefcase-outline" className="text-lg text-primary-500" />
                      </div>

                      {/* Right Content */}
                      <div className="text-left pl-6">
                        <div className="mb-1">
                          <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                            {timelineItem.period}
                          </span>
                        </div>
                        <div
                          className="inline-block rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/10 dark:hover:shadow-primary-500/10"
                          style={{
                            boxShadow:
                              '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
                          }}
                        >
                          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                            {timelineItem.title}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                              {timelineItem.company}
                            </span>
                            {timelineItem.link && (
                              <a
                                href={timelineItem.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-primary-500 transition-colors"
                              >
                                <Icon icon="mdi:open-in-new" className="text-xs" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            {timelineItem.description}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
