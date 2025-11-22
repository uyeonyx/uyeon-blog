'use client'

import { motion } from 'framer-motion'
import NextLink from 'next/link'
import SocialIcon from '@/components/social-icons'
import siteMetadata from '@/data/siteMetadata'

const socialIcons = [
  { kind: 'mail' as const, href: `mailto:${siteMetadata.email}`, label: 'Email' },
  { kind: 'github' as const, href: siteMetadata.github, label: 'GitHub' },
  { kind: 'linkedin' as const, href: siteMetadata.linkedin, label: 'LinkedIn' },
  { kind: 'x' as const, href: siteMetadata.x, label: 'X (Twitter)' },
]

export default function Footer() {
  return (
    <footer className="mt-32 mb-12">
      <motion.div
        className="flex flex-col items-center space-y-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {/* Social Icons - Glassmorphic */}
        <motion.div
          className="group relative rounded-2xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl shadow-2xl shadow-gray-900/20 dark:shadow-primary-500/20 border border-white/60 dark:border-gray-600/80 px-8 py-4 before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:before:from-white/10"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {/* Subtle Gradient Background */}
          <motion.div
            className="absolute inset-0 rounded-2xl bg-linear-to-r from-primary-500/5 via-primary-400/3 to-primary-600/5"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />

          <div className="relative flex gap-6">
            {socialIcons.map((icon, index) => (
              <motion.div
                key={icon.kind}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: index * 0.1,
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <SocialIcon kind={icon.kind} href={icon.href} size={5} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Copyright & Title */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <motion.p
            className="text-sm font-medium text-gray-600 dark:text-gray-400"
            whileHover={{ scale: 1.05 }}
          >
            {siteMetadata.author} · {new Date().getFullYear()}
          </motion.p>
          <NextLink
            href="/"
            className="text-xs text-gray-400 dark:text-gray-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors inline-block"
          >
            <motion.span whileHover={{ scale: 1.1 }} className="inline-block">
              {siteMetadata.title}
            </motion.span>
          </NextLink>
        </motion.div>
      </motion.div>
    </footer>
  )
}
