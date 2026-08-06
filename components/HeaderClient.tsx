'use client'

import { Icon } from '@iconify/react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'
import navLinks from '@/data/headerNavLinks'
import siteMetadata from '@/data/siteMetadata'
import { useI18n } from '@/lib/i18n/i18n-context'
import LanguageSwitch from './LanguageSwitch'
import Link from './Link'
import Logo from './Logo'
import MobileNav from './MobileNav'
import SearchButton from './SearchButton'
import ThemeSwitch from './ThemeSwitch'

const HeaderClient = () => {
  const [isHovered, setIsHovered] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  // md~xl 구간: SectionContainer(max-w-3xl)가 가용 폭을 720px로 묶어서 여유가 없다
  const [isNarrowDesktop, setIsNarrowDesktop] = useState(false)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const { t } = useI18n()

  useEffect(() => {
    setMounted(true)

    // 모바일 여부 감지
    const checkMobile = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsNarrowDesktop(width >= 768 && width < 1280)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Smooth spring animations
  const springConfig = { stiffness: 150, damping: 15 }
  const rotateX = useSpring(useTransform(mouseY, [-100, 100], [5, -5]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [-100, 100], [-5, 5]), springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    mouseX.set(e.clientX - centerX)
    mouseY.set(e.clientY - centerY)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
    setIsHovered(false)
  }

  return (
    <header className="flex justify-center pt-8 pb-4 relative z-50">
      <motion.div
        className="relative max-w-full"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: 1000,
        }}
      >
        {/* Main Island Container */}
        <motion.div
          className="relative overflow-visible rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl shadow-2xl shadow-gray-900/20 dark:shadow-primary-500/20 border border-white/60 dark:border-gray-600/80 px-6 py-3 before:absolute before:inset-0 before:rounded-full before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:before:from-white/10"
          initial={{
            paddingLeft: '1.5rem',
            paddingRight: '1.5rem',
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
          }}
          animate={{
            paddingLeft: isNarrowDesktop ? '1.25rem' : isHovered ? '2rem' : '1.5rem',
            paddingRight: isNarrowDesktop ? '1.25rem' : isHovered ? '2rem' : '1.5rem',
            paddingTop: isHovered ? '1rem' : '0.75rem',
            paddingBottom: isHovered ? '1rem' : '0.75rem',
          }}
          style={{
            rotateX: isMobile ? 0 : rotateX,
            rotateY: isMobile ? 0 : rotateY,
          }}
          transition={
            mounted
              ? {
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                }
              : { duration: 0 }
          }
        >
          {/* Animated Gradient Background */}
          <motion.div
            className="absolute inset-0 rounded-full bg-linear-to-r from-primary-500/10 via-primary-400/5 to-primary-600/10"
            animate={{
              opacity: isHovered ? 1 : 0,
            }}
            transition={mounted ? { duration: 0.3 } : { duration: 0 }}
          />

          {/* Content */}
          <div className="relative flex items-center gap-6 md:gap-3 xl:gap-6">
            {/* Logo Text - Always visible on mobile, hover on desktop */}
            <Link
              href="/"
              aria-label={siteMetadata.headerTitle}
              className="flex shrink-0 items-center"
            >
              <Logo className="h-6 w-auto" />
              {/* Mobile: Always visible */}
              <span className="md:hidden ml-2.5 text-xl font-bold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">
                {typeof siteMetadata.headerTitle === 'string' ? siteMetadata.headerTitle : ''}
              </span>
              {/* Desktop: Show on hover */}
              <motion.span
                className="hidden md:inline-block text-lg xl:text-xl font-bold tracking-tight text-gray-900 dark:text-white overflow-hidden whitespace-nowrap"
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{
                  opacity: isHovered ? 1 : 0,
                  width: isHovered ? 'auto' : 0,
                  marginLeft: isHovered ? '0.625rem' : 0,
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={mounted ? { duration: 0.3 } : { duration: 0 }}
              >
                {typeof siteMetadata.headerTitle === 'string' ? siteMetadata.headerTitle : ''}
              </motion.span>
            </Link>

            {/* Animated Divider - Mobile: always visible, Desktop: on hover */}
            <div className="md:hidden h-6 w-px shrink-0 bg-gray-300 dark:bg-gray-700" />
            <motion.div
              className="hidden md:block h-6 w-px shrink-0 bg-gray-300 dark:bg-gray-700"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{
                scaleY: isHovered ? 1 : 0,
                opacity: isHovered ? 1 : 0,
              }}
              transition={mounted ? { duration: 0.2 } : { duration: 0 }}
            />

            {/* Navigation Links - Desktop */}
            <nav className="hidden md:flex shrink-0 items-center gap-0.5 xl:gap-1">
              {navLinks
                .filter((link) => link.href !== '/')
                .map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0.8, scale: 0.95 }}
                    animate={{
                      opacity: isHovered ? 1 : 0.8,
                      scale: isHovered ? 1 : 0.95,
                    }}
                    transition={
                      mounted
                        ? {
                            delay: index * 0.05,
                            duration: 0.2,
                          }
                        : { duration: 0 }
                    }
                  >
                    <Link
                      href={link.href}
                      className="block px-2 py-2 text-sm xl:px-3 xl:text-base font-medium whitespace-nowrap text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-900/5 dark:hover:bg-white/10 transition-all"
                    >
                      {t(link.key)}
                    </Link>
                  </motion.div>
                ))}
            </nav>

            {/* Animated Divider */}
            <motion.div
              className="hidden md:block h-6 w-px shrink-0 bg-gray-300 dark:bg-gray-700"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{
                scaleY: isHovered ? 1 : 0,
                opacity: isHovered ? 1 : 0,
              }}
              transition={mounted ? { duration: 0.2, delay: 0.1 } : { duration: 0 }}
            />

            {/* Actions - Desktop only */}
            <div className="hidden md:flex shrink-0 items-center gap-1 xl:gap-2">
              <motion.div
                className="[&>button]:text-gray-700 [&>button]:dark:text-gray-200 [&>button]:hover:text-gray-900 [&>button]:dark:hover:text-white [&>button]:hover:bg-gray-900/5 [&>button]:dark:hover:bg-white/10 [&>button]:rounded-full [&>button]:p-2 [&>button]:transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <SearchButton />
              </motion.div>
              <motion.div
                className="[&>button]:text-gray-700 [&>button]:dark:text-gray-200 [&>button]:hover:text-gray-900 [&>button]:dark:hover:text-white [&>button]:hover:bg-gray-900/5 [&>button]:dark:hover:bg-white/10 [&>button]:rounded-full [&>button]:p-2 [&>button]:transition-colors [&>button]:border [&>button]:border-gray-300/50 [&>button]:dark:border-gray-500/50"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <LanguageSwitch />
              </motion.div>
              <motion.div
                className="[&>button]:text-gray-700 [&>button]:dark:text-gray-200 [&>button]:hover:text-gray-900 [&>button]:dark:hover:text-white [&>button]:hover:bg-gray-900/5 [&>button]:dark:hover:bg-white/10 [&>button]:rounded-full [&>button]:p-2 [&>button]:transition-colors [&>button]:border [&>button]:border-gray-300/50 [&>button]:dark:border-gray-500/50"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <ThemeSwitch />
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/admin"
                  aria-label="작성자 모드"
                  className="flex rounded-full border border-gray-300/50 p-2 text-gray-700 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:border-gray-500/50 dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Icon icon="solar:pen-2-bold" className="h-5 w-5" />
                </Link>
              </motion.div>
            </div>

            {/* Mobile Menu Button */}
            <MobileNav />
          </div>

          {/* Subtle Glow Effect */}
          <motion.div
            className="absolute -inset-1 rounded-full bg-linear-to-r from-primary-500/10 to-primary-600/10 blur-xl -z-10"
            animate={{
              opacity: isHovered ? 0.5 : 0,
            }}
            transition={mounted ? { duration: 0.3 } : { duration: 0 }}
          />
        </motion.div>
      </motion.div>
    </header>
  )
}

export default HeaderClient
