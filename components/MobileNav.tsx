'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import headerNavLinks from '@/data/headerNavLinks'
import Link from './Link'

const MobileNav = () => {
  const [navShow, setNavShow] = useState(false)

  const onToggleNav = () => {
    setNavShow((prev) => !prev)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <motion.button
        type="button"
        aria-label="Toggle Menu"
        onClick={onToggleNav}
        className="md:hidden p-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-900/5 dark:hover:bg-white/10 rounded-full transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <motion.div animate={{ rotate: navShow ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <Icon
            icon={navShow ? 'solar:close-circle-bold' : 'solar:hamburger-menu-bold'}
            className="h-5 w-5"
          />
        </motion.div>
      </motion.button>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {navShow && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={onToggleNav}
              onKeyDown={(e) => e.key === 'Escape' && onToggleNav()}
              role="button"
              tabIndex={0}
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />

            {/* Dropdown Island */}
            <motion.div
              className="fixed top-24 left-1/2 z-50 -translate-x-1/2 md:hidden"
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
              }}
            >
              <motion.div
                className="relative rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl shadow-2xl shadow-gray-900/20 dark:shadow-primary-500/20 border border-white/60 dark:border-gray-600/80 p-6 min-w-[280px] max-w-[90vw] before:absolute before:inset-0 before:rounded-3xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:before:from-white/10"
                whileHover={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {/* Subtle Gradient Background */}
                <div className="absolute inset-0 bg-linear-to-br from-primary-500/10 via-primary-400/5 to-primary-600/10 rounded-3xl" />

                {/* Navigation */}
                <nav className="relative space-y-2">
                  {headerNavLinks.map((link, index) => (
                    <motion.div
                      key={link.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: index * 0.1,
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                      }}
                    >
                      <Link
                        href={link.href}
                        className="block px-4 py-3 text-base font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-900/5 dark:hover:bg-white/10 rounded-xl transition-colors"
                        onClick={onToggleNav}
                      >
                        <motion.span
                          className="inline-block"
                          whileHover={{ x: 5 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          {link.title}
                        </motion.span>
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {/* Subtle Glow Effect */}
                <div className="absolute -inset-1 rounded-3xl bg-linear-to-r from-primary-500/10 to-primary-600/10 blur-xl opacity-30 -z-10" />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default MobileNav
