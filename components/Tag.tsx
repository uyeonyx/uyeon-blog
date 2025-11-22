'use client'

import { motion } from 'framer-motion'
import { slug } from 'github-slugger'
import Link from 'next/link'

interface Props {
  text: string
}

const Tag = ({ text }: Props) => {
  return (
    <Link href={`/tags/${slug(text)}`}>
      <motion.span
        className="relative inline-flex items-center rounded-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border border-white/60 dark:border-gray-700/80 shadow-lg shadow-gray-900/10 dark:shadow-primary-500/10 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-primary-500/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer before:absolute before:inset-0 before:rounded-full before:bg-linear-to-b before:from-white/30 before:to-transparent before:pointer-events-none dark:before:from-white/5"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {text.split(' ').join('-')}
      </motion.span>
    </Link>
  )
}

export default Tag
