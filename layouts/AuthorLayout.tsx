'use client'

import type { Authors } from 'contentlayer/generated'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import SocialIcon from '@/components/social-icons'
import { useI18n } from '@/lib/i18n/i18n-context'

interface Props {
  children: ReactNode
  content: Omit<Authors, '_id' | '_raw' | 'body'>
}

export default function AuthorLayout({ children, content }: Props) {
  const { name, avatar, occupation, company, email, twitter, bluesky, linkedin, github } = content
  const { t } = useI18n()

  const cardRef = useRef<HTMLDivElement>(null)

  // Mouse position tracking
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring physics for smooth animation
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), {
    stiffness: 300,
    damping: 30,
  })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), {
    stiffness: 300,
    damping: 30,
  })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const percentX = (e.clientX - centerX) / (rect.width / 2)
    const percentY = (e.clientY - centerY) / (rect.height / 2)

    mouseX.set(percentX)
    mouseY.set(percentY)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="divide-y divide-gray-200 dark:divide-gray-700"
    >
      <div className="space-y-2 pt-6 pb-8 md:space-y-5">
        <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl dark:text-gray-100">
          {t('pages.about.title')}
        </h1>
      </div>
      <div className="items-start space-y-2 xl:grid xl:grid-cols-3 xl:gap-x-8 xl:space-y-0">
        <div className="flex flex-col items-center pt-8">
          {avatar && (
            <motion.div
              ref={cardRef}
              className="group relative mb-4 xl:mb-6"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                transformStyle: 'preserve-3d',
                perspective: 1000,
              }}
            >
              <motion.div
                className="relative"
                style={{
                  rotateX,
                  rotateY,
                  transformStyle: 'preserve-3d',
                }}
              >
                <img
                  src={avatar}
                  alt={`${name} ${t('blog.profilePhoto')}`}
                  className="h-32 w-32 rounded-full ring-2 ring-gray-200 shadow-lg dark:ring-gray-700 xl:h-48 xl:w-48 xl:ring-4 xl:ring-gray-100 xl:shadow-xl xl:dark:ring-gray-900"
                />

                {/* Subtle shine on hover */}
                <motion.div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
                  }}
                />
              </motion.div>
            </motion.div>
          )}
          <h3 className="pb-2 text-2xl font-bold leading-8 tracking-tight">{name}</h3>
          <div className="text-gray-500 dark:text-gray-400">{occupation}</div>
          <div className="text-gray-500 dark:text-gray-400">{company}</div>
          <div className="flex space-x-3 pt-6">
            <SocialIcon kind="mail" href={`mailto:${email}`} />
            <SocialIcon kind="github" href={github} />
            <SocialIcon kind="linkedin" href={linkedin} />
            <SocialIcon kind="x" href={twitter} />
            <SocialIcon kind="bluesky" href={bluesky} />
          </div>
        </div>
        <div className="prose dark:prose-invert max-w-none pt-8 pb-8 xl:col-span-2">{children}</div>
      </div>
    </motion.div>
  )
}
