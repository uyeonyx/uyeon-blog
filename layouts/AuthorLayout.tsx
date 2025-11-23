'use client'

import type { Authors } from 'contentlayer/generated'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import Image from '@/components/Image'
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
              className="group relative mb-6"
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
                className="relative overflow-hidden rounded-3xl bg-white/60 dark:bg-gray-800/50 backdrop-blur-2xl"
                style={{
                  rotateX,
                  rotateY,
                  transformStyle: 'preserve-3d',
                  boxShadow: `
                    0 30px 60px -15px rgba(0, 0, 0, 0.25),
                    0 15px 30px -10px rgba(0, 0, 0, 0.15),
                    0 5px 15px rgba(0, 0, 0, 0.08),
                    0 0 0 3px rgba(255, 255, 255, 0.4) inset,
                    0 0 0 1px rgba(255, 255, 255, 0.7) inset,
                    0 6px 12px rgba(255, 255, 255, 0.25) inset,
                    0 -3px 8px rgba(0, 0, 0, 0.15) inset
                  `,
                }}
              >
                {/* 3D beveled edge effect - top */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-b from-white/60 to-transparent dark:from-white/30 rounded-t-3xl pointer-events-none z-20" />

                {/* 3D beveled edge effect - left */}
                <div className="absolute top-0 left-0 bottom-0 w-2 bg-linear-to-r from-white/60 to-transparent dark:from-white/30 rounded-l-3xl pointer-events-none z-20" />

                {/* 3D beveled edge effect - right */}
                <div className="absolute top-0 right-0 bottom-0 w-2 bg-linear-to-l from-white/40 to-transparent dark:from-white/20 rounded-r-3xl pointer-events-none z-20" />

                {/* 3D beveled edge effect - bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-linear-to-t from-black/20 to-transparent dark:from-black/30 rounded-b-3xl pointer-events-none z-20" />

                {/* Glass reflection overlay */}
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-linear-to-b from-white/30 to-transparent dark:from-white/10 rounded-t-3xl pointer-events-none z-10" />

                <Image
                  src={avatar}
                  alt="avatar"
                  width={192}
                  height={192}
                  className="h-48 w-48 rounded-3xl relative"
                />

                {/* Glass shine on hover */}
                <motion.div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
                    transform: 'translateZ(1px)',
                  }}
                />
              </motion.div>
            </motion.div>
          )}
          <h3 className="pt-4 pb-2 text-2xl leading-8 font-bold tracking-tight">{name}</h3>
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
