'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

const basePath = process.env.BASE_PATH

interface ImageProps {
  src: string
  alt?: string
  width?: number
  height?: number
  className?: string
}

const Image = ({ src, alt }: ImageProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const fullSrc = `${basePath || ''}${src}`

  return (
    <>
      <motion.div
        className="group relative my-8 cursor-pointer"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
        onClick={() => setIsOpen(true)}
      >
        {/* Glassmorphism card - Avatar style */}
        <motion.div
          className="relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-2xl dark:bg-gray-800/50"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{
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
          <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 h-2 rounded-t-2xl bg-linear-to-b from-white/60 to-transparent dark:from-white/30" />

          {/* 3D beveled edge effect - left */}
          <div className="pointer-events-none absolute top-0 left-0 bottom-0 z-20 w-2 rounded-l-2xl bg-linear-to-r from-white/60 to-transparent dark:from-white/30" />

          {/* 3D beveled edge effect - right */}
          <div className="pointer-events-none absolute top-0 right-0 bottom-0 z-20 w-2 rounded-r-2xl bg-linear-to-l from-white/40 to-transparent dark:from-white/20" />

          {/* 3D beveled edge effect - bottom */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-2 rounded-b-2xl bg-linear-to-t from-black/20 to-transparent dark:from-black/30" />

          {/* Glass reflection overlay */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-1/3 rounded-t-2xl bg-linear-to-b from-white/30 to-transparent dark:from-white/10" />

          {/* Image - seamless (using img for perfect fit) */}
          <img
            src={fullSrc}
            alt={alt || ''}
            className="relative block w-full h-auto rounded-2xl"
            style={{ display: 'block', margin: 0, padding: 0 }}
          />

          {/* Glass shine on hover */}
          <motion.div
            className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
            }}
          />

          {/* Fullscreen button - bottom right */}
          <div className="absolute bottom-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-black/50 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100 hover:bg-black/70 dark:bg-white/20 dark:hover:bg-white/30">
            <Icon icon="mdi:fullscreen" className="text-2xl text-white" />
          </div>
        </motion.div>

        {/* Caption if alt text exists - shown on hover */}
        {alt && (
          <div className="mt-3 text-center text-sm italic text-gray-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:text-gray-400">
            {alt}
          </div>
        )}
      </motion.div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            {/* Close button */}
            <button
              type="button"
              className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-colors hover:bg-white/20"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              <Icon icon="mdi:close" className="text-3xl text-white" />
            </button>

            {/* Enlarged image */}
            <motion.div
              className="relative max-h-[90vh] max-w-[90vw]"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={fullSrc}
                alt={alt || ''}
                className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
              />
              {alt && <div className="mt-4 text-center text-sm text-white/80">{alt}</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Image
