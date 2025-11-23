'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n/i18n-context'
import LanguageSwitch from './LanguageSwitch'
import Link from './Link'
import SearchButton from './SearchButton'
import ThemeSwitch from './ThemeSwitch'

const navLinks = [
  { href: '/', key: 'common.home' },
  { href: '/blog', key: 'common.blog' },
  { href: '/tags', key: 'common.tags' },
  { href: '/projects', key: 'common.projects' },
  { href: '/about', key: 'common.about' },
]

const MobileNav = () => {
  const [navShow, setNavShow] = useState(false)
  const { t } = useI18n()
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const onToggleNav = () => {
    setNavShow((prev) => !prev)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        navShow &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setNavShow(false)
      }
    }

    if (navShow) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [navShow])

  return (
    <div className="relative md:hidden">
      {/* Mobile Menu Button */}
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('common.toggleMenu')}
        onClick={onToggleNav}
        className="p-2.5 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-900/5 dark:hover:bg-white/10 rounded-full transition-colors border border-gray-300/50 dark:border-gray-500/50"
      >
        <Icon
          icon={navShow ? 'solar:close-circle-bold' : 'solar:hamburger-menu-bold'}
          className="h-6 w-6"
        />
      </button>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {navShow && (
          <motion.div
            ref={menuRef}
            className="fixed top-[6rem] left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-md z-[9999]"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              duration: 0.2,
              ease: 'easeOut',
            }}
          >
            <div className="relative rounded-2xl bg-white dark:bg-gray-800 shadow-2xl shadow-gray-900/40 dark:shadow-black/60 border border-gray-200 dark:border-gray-600 overflow-hidden">
              {/* Subtle Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-primary-600/5" />

              {/* Content */}
              <div className="relative p-4 space-y-1">
                {/* Navigation Links */}
                <nav className="space-y-1">
                  {navLinks.map((link) => (
                    <div key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center px-4 py-3 text-base font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors active:bg-gray-200 dark:active:bg-white/20"
                        onClick={onToggleNav}
                      >
                        {t(link.key)}
                      </Link>
                    </div>
                  ))}
                </nav>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent my-2" />

                {/* Action Buttons */}
                <div className="flex items-center justify-around gap-2 px-2 py-2">
                  <div className="flex-1 flex justify-center [&>button]:w-full [&>button]:text-gray-700 [&>button]:dark:text-gray-200 [&>button]:hover:text-gray-900 [&>button]:dark:hover:text-white [&>button]:hover:bg-gray-100 [&>button]:dark:hover:bg-white/10 [&>button]:rounded-lg [&>button]:p-2.5 [&>button]:transition-colors [&>button]:active:bg-gray-200 [&>button]:dark:active:bg-white/20">
                    <SearchButton />
                  </div>
                  <div className="flex-1 flex justify-center [&>button]:w-full [&>button]:text-gray-700 [&>button]:dark:text-gray-200 [&>button]:hover:text-gray-900 [&>button]:dark:hover:text-white [&>button]:hover:bg-gray-100 [&>button]:dark:hover:bg-white/10 [&>button]:rounded-lg [&>button]:p-2.5 [&>button]:transition-colors [&>button]:border [&>button]:border-gray-200 [&>button]:dark:border-gray-600/50 [&>button]:active:bg-gray-200 [&>button]:dark:active:bg-white/20">
                    <LanguageSwitch />
                  </div>
                  <div className="flex-1 flex justify-center [&>button]:w-full [&>button]:text-gray-700 [&>button]:dark:text-gray-200 [&>button]:hover:text-gray-900 [&>button]:dark:hover:text-white [&>button]:hover:bg-gray-100 [&>button]:dark:hover:bg-white/10 [&>button]:rounded-lg [&>button]:p-2.5 [&>button]:transition-colors [&>button]:border [&>button]:border-gray-200 [&>button]:dark:border-gray-600/50 [&>button]:active:bg-gray-200 [&>button]:dark:active:bg-white/20">
                    <ThemeSwitch />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MobileNav

