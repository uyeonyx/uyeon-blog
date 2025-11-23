'use client'

import { motion, useScroll, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import siteMetadata from '@/data/siteMetadata'
import { useI18n } from '@/lib/i18n/i18n-context'

const ScrollTopAndComment = () => {
  const [show, setShow] = useState(false)
  const { t } = useI18n()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  useEffect(() => {
    const handleWindowScroll = () => {
      if (window.scrollY > 50) setShow(true)
      else setShow(false)
    }

    window.addEventListener('scroll', handleWindowScroll)
    return () => window.removeEventListener('scroll', handleWindowScroll)
  }, [])

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handleScrollToComment = () => {
    document.getElementById('comment')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-linear-to-r from-primary-500 to-primary-600 origin-left z-50"
        style={{ scaleX }}
      />

      {/* Scroll Buttons */}
      <motion.div
        className="fixed right-8 bottom-8 hidden md:block"
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{
          opacity: show ? 1 : 0,
          y: show ? 0 : 20,
          scale: show ? 1 : 0.8,
        }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 20,
        }}
      >
        <motion.div
          className="group relative rounded-2xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl shadow-2xl shadow-gray-900/20 dark:shadow-primary-500/20 border border-white/60 dark:border-gray-600/80 p-3 before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:before:from-white/10"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Subtle Gradient Background */}
          <motion.div
            className="absolute inset-0 rounded-2xl bg-linear-to-r from-primary-500/10 via-primary-400/5 to-primary-600/10"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />

          <div className="relative flex flex-col gap-3">
            {siteMetadata.comments?.provider && (
              <motion.button
                type="button"
                aria-label={t('common.scrollToComments')}
                onClick={handleScrollToComment}
                className="rounded-full p-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-900/5 dark:hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" role="img">
                  <title>{t('common.scrollToComments')}</title>
                  <path
                    fillRule="evenodd"
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                    clipRule="evenodd"
                  />
                </svg>
              </motion.button>
            )}
            <motion.button
              type="button"
              aria-label={t('common.scrollToTop')}
              onClick={handleScrollTop}
              className="rounded-full p-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-900/5 dark:hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" role="img">
                <title>{t('common.scrollToTop')}</title>
                <path
                  fillRule="evenodd"
                  d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.button>
          </div>

          {/* Subtle Glow Effect */}
          <motion.div
            className="absolute -inset-1 rounded-2xl bg-linear-to-r from-primary-500/10 to-primary-600/10 blur-xl -z-10"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 0.5 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </motion.div>
    </>
  )
}

export default ScrollTopAndComment
