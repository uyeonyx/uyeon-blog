'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n/i18n-context'

interface TocItem {
  value: string
  url: string
  depth: number
}

interface FloatingTOCProps {
  toc: TocItem[]
}

// Custom scrollbar styles
const scrollbarStyles = `
  .toc-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .toc-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .toc-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 2px;
  }
  .toc-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);
  }
  .dark .toc-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(107, 114, 128, 0.3);
  }
  .dark .toc-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(107, 114, 128, 0.5);
  }
`

export default function FloatingTOC({ toc }: FloatingTOCProps) {
  const [activeId, setActiveId] = useState<string>('')
  const { t } = useI18n()

  useEffect(() => {
    if (!toc || toc.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-80px 0px -80% 0px',
        threshold: 0,
      }
    )

    // Observe all headings
    const headingElements = toc.map((item) => {
      const id = item.url.replace('#', '')
      return document.getElementById(id)
    })

    headingElements.forEach((element) => {
      if (element) observer.observe(element)
    })

    return () => {
      headingElements.forEach((element) => {
        if (element) observer.unobserve(element)
      })
    }
  }, [toc])

  // Scroll active item to center
  useEffect(() => {
    if (activeId) {
      const activeElement = document.querySelector(`a[href="#${activeId}"]`)
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
    }
  }, [activeId])

  if (!toc || toc.length === 0) return null

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.preventDefault()
    const id = url.replace('#', '')
    const element = document.getElementById(id)
    if (element) {
      const offsetTop = element.offsetTop - 100
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth',
      })
      setActiveId(id)
    }
  }

  return (
    <>
      <style>{scrollbarStyles}</style>
      <motion.nav
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="toc-scrollbar hidden 2xl:block fixed top-24 left-[calc(50%+640px)] w-64 max-h-[calc(100vh-300px)] overflow-y-auto z-60"
      >
      <div className="group relative rounded-xl border border-white/60 bg-white/30 backdrop-blur-xl pt-4 px-4 pb-2 shadow-lg dark:border-white/10 dark:bg-gray-900/30">
        {/* Glass reflection overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-linear-to-br from-white/40 to-transparent dark:from-white/5" />
        
        {/* Content */}
        <div className="relative">
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('blog.tableOfContents') || 'On This Page'}
          </h3>
        <ul className="space-y-0.5">
          {toc.map((item) => {
            const id = item.url.replace('#', '')
            const isActive = activeId === id
            const paddingLeft = `${(item.depth - 1) * 0.75}rem`
            
            // depth에 따른 스타일 결정
            const depthStyles = {
              1: 'text-sm font-bold', // h1
              2: 'text-xs font-semibold', // h2
              3: 'text-xs font-normal', // h3
            }[item.depth] || 'text-xs font-normal'

            return (
              <li key={item.url} style={{ paddingLeft }}>
                <a
                  href={item.url}
                  onClick={(e) => handleClick(e, item.url)}
                  className={`block py-1 transition-all duration-200 line-clamp-2 ${depthStyles} ${
                    isActive
                      ? 'text-primary-600 dark:text-primary-400 opacity-100 scale-[1.02] translate-x-0.5'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 opacity-50 hover:opacity-75'
                  }`}
                >
                  {item.value}
                </a>
              </li>
            )
          })}
        </ul>
        </div>
      </div>
      </motion.nav>
    </>
  )
}

