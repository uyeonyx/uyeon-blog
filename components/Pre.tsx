'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { useState } from 'react'

interface PreProps {
  children: React.ReactNode
  className?: string
  'data-language'?: string
}

const Pre = ({ children, className, 'data-language': language }: PreProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const code = (children as { props?: { children?: string } })?.props?.children
    if (typeof code === 'string') {
      navigator.clipboard.writeText(code.trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <motion.div
      className="group relative my-6"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
    >
      {/* Glassmorphism card wrapper */}
      <div
        className="relative overflow-hidden rounded-2xl bg-white/40 backdrop-blur-2xl dark:bg-gray-900/40"
        style={{
          boxShadow: `
            0 20px 40px -10px rgba(0, 0, 0, 0.2),
            0 10px 20px -5px rgba(0, 0, 0, 0.15),
            0 5px 10px rgba(0, 0, 0, 0.08),
            0 0 0 2px rgba(255, 255, 255, 0.3) inset,
            0 0 0 1px rgba(255, 255, 255, 0.5) inset,
            0 4px 8px rgba(255, 255, 255, 0.2) inset,
            0 -2px 6px rgba(0, 0, 0, 0.1) inset
          `,
        }}
      >
        {/* 3D beveled edges */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 h-1.5 rounded-t-2xl bg-linear-to-b from-white/50 to-transparent dark:from-white/20" />
        <div className="pointer-events-none absolute top-0 left-0 bottom-0 z-20 w-1.5 rounded-l-2xl bg-linear-to-r from-white/50 to-transparent dark:from-white/20" />
        <div className="pointer-events-none absolute top-0 right-0 bottom-0 z-20 w-1.5 rounded-r-2xl bg-linear-to-l from-white/30 to-transparent dark:from-white/10" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-1.5 rounded-b-2xl bg-linear-to-t from-black/15 to-transparent dark:from-black/25" />

        {/* Glass reflection */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-1/4 rounded-t-2xl bg-linear-to-b from-white/20 to-transparent dark:from-white/5" />

        {/* Language tag */}
        {language && (
          <div className="absolute left-4 top-3 z-30 rounded-lg bg-black/30 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md dark:bg-white/10">
            {language}
          </div>
        )}

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-4 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-black/50 group-hover:opacity-100 dark:bg-white/10 dark:hover:bg-white/20"
          aria-label="Copy code"
        >
          <Icon
            icon={copied ? 'mdi:check' : 'mdi:content-copy'}
            className={`text-lg ${copied ? 'text-green-400' : 'text-white/90'}`}
          />
        </button>

        {/* Code content */}
        <pre className={`relative overflow-x-auto rounded-2xl ${className || ''}`}>{children}</pre>

        {/* Hover shine effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
          }}
        />
      </div>
    </motion.div>
  )
}

export default Pre
