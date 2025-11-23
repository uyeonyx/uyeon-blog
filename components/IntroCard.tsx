'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/i18n-context'

interface IntroCardProps {
  children: React.ReactNode
}

export default function IntroCard({ children }: IntroCardProps) {
  const { t } = useI18n()

  return (
    <motion.div
      className="mt-8 not-prose"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Icon icon="mdi:compass-outline" className="text-3xl text-primary-500" />
        {t('pages.about.philosophy')}
      </h2>
      <div
        className="relative rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/10 dark:hover:shadow-primary-500/10"
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="prose dark:prose-invert max-w-none">
          <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            {children}
          </div>
        </div>

        {/* Subtle Hover Effect */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03), transparent)',
          }}
        />
      </div>
    </motion.div>
  )
}
