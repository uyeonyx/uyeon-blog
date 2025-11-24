'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/i18n-context'
import { Icon } from '@iconify/react'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { components } from '@/components/MDXComponents'
import Image from './Image'
import Link from './Link'

// Modal 내 헤더 - hash만 사용하여 헤더 ID 추가
const ModalHeading = ({ level, children, id, slug, ...props }: any) => {
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    // 헤더 내부의 링크 클릭 감지
    const target = e.target as HTMLElement
    if (target.closest('.content-header-link') && id) {
      e.preventDefault()
      
      // hash만 업데이트 (query param은 유지)
      window.location.hash = id
      
      // 모달 내에서 스크롤
      const element = document.getElementById(id)
      if (element) {
        const modalContent = element.closest('[data-slot="dialog-content"]')
        if (modalContent) {
          const elementTop = element.offsetTop
          modalContent.scrollTo({
            top: elementTop - 100, // 약간의 여백
            behavior: 'smooth',
          })
        }
      }
    }
  }

  const headingProps = {
    id,
    onClick: handleClick,
    ...props,
  }
  
  // rehypeAutolinkHeadings가 이미 링크를 추가하므로 별도로 추가하지 않음
  switch (level) {
    case 1:
      return <h1 {...headingProps}>{children}</h1>
    case 2:
      return <h2 {...headingProps}>{children}</h2>
    case 3:
      return <h3 {...headingProps}>{children}</h3>
    case 4:
      return <h4 {...headingProps}>{children}</h4>
    case 5:
      return <h5 {...headingProps}>{children}</h5>
    case 6:
      return <h6 {...headingProps}>{children}</h6>
    default:
      return <div {...headingProps}>{children}</div>
  }
}

interface ProjectCardProps {
  project: {
    slug: string
    title: string
    description: string
    imgSrc?: string
    href?: string
    period?: string
    role?: string
    company?: string
    tags?: string[]
    body: {
      code: string
    }
  }
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const ProjectCard = ({ project, isOpen: externalIsOpen, onOpenChange }: ProjectCardProps) => {
  const { t } = useI18n()
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const { slug, title, description, imgSrc, href, period, role, company, tags } = project

  // Controlled by parent or internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = onOpenChange || setInternalIsOpen

  // 모달 내에서 사용할 커스텀 컴포넌트 (헤더 클릭 시 URL 업데이트)
  const modalComponents = useMemo(
    () => ({
      ...components,
      h1: (props: any) => <ModalHeading level={1} {...props} />,
      h2: (props: any) => <ModalHeading level={2} {...props} />,
      h3: (props: any) => <ModalHeading level={3} {...props} />,
      h4: (props: any) => <ModalHeading level={4} {...props} />,
      h5: (props: any) => <ModalHeading level={5} {...props} />,
      h6: (props: any) => <ModalHeading level={6} {...props} />,
    }),
    []
  )

  // 모달이 열릴 때 URL hash의 헤더 ID로 스크롤
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const hash = window.location.hash.slice(1) // Remove '#'
        if (hash) {
          const element = document.getElementById(hash)
          if (element) {
            const modalContent = element.closest('[data-slot="dialog-content"]')
            if (modalContent) {
              const elementTop = element.offsetTop
              modalContent.scrollTo({
                top: elementTop - 100,
                behavior: 'smooth',
              })
            }
          }
        }
      }, 100) // 모달이 완전히 렌더링된 후 스크롤
    }
  }, [isOpen])

  return (
    <>
      <motion.div
        className="md max-w-[544px] p-4 md:w-1/2"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="group relative overflow-hidden rounded-2xl border border-white/60 dark:border-gray-700/80 bg-white/70 dark:bg-gray-900/70 backdrop-blur-3xl shadow-xl shadow-gray-900/10 dark:shadow-primary-500/10 transition-all duration-300 hover:border-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/20 cursor-pointer before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:before:from-white/5 h-full"
          onClick={() => setIsOpen(true)}
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {imgSrc && (
            <Image
              alt={title}
              src={imgSrc}
              className="object-cover object-center md:h-36 lg:h-48 transition-transform duration-300 group-hover:scale-105"
              width={544}
              height={306}
            />
          )}
          <div className="relative p-6 z-10">
            <div className="flex items-start justify-between gap-2 mb-3">
              <h2 className="text-2xl leading-8 font-bold tracking-tight text-gray-900 dark:text-gray-50 transition-colors group-hover:text-primary-500 dark:group-hover:text-primary-400">
                {title}
              </h2>
              {href && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(href, '_blank', 'noopener,noreferrer')
                  }}
                  className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 shrink-0 transition-all hover:scale-110 active:scale-95"
                  aria-label={`Open ${title} in new tab`}
                >
                  <Icon icon="solar:link-bold" className="size-6" />
                </button>
              )}
            </div>

            {(period || role || company) && (
              <div className="mb-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {period && <div className="flex items-center gap-2">
                  <Icon icon="solar:calendar-bold" className="size-4" />
                  <span>{period}</span>
                </div>}
                {role && <div className="flex items-center gap-2">
                  <Icon icon="solar:user-bold" className="size-4" />
                  <span>{role}</span>
                </div>}
                {company && <div className="flex items-center gap-2">
                  <Icon icon="solar:buildings-2-bold" className="size-4" />
                  <span>{company}</span>
                </div>}
              </div>
            )}

            <p className="prose mb-3 max-w-none text-gray-500 dark:text-gray-400 line-clamp-3">
              {description}
            </p>

            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full bg-primary-100/80 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="inline-flex items-center gap-2 text-primary-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 text-base leading-6 font-semibold transition-colors">
              상세 보기
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="scrollbar-thin">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-10">
              <div className="flex-1">
                <DialogTitle className="text-gray-900 dark:text-gray-50">{title}</DialogTitle>
                <DialogDescription className="mt-2 text-gray-600 dark:text-gray-400">
                  {description}
                </DialogDescription>
              </div>
              {href && (
                <Link
                  href={href}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500/90 hover:bg-primary-500 backdrop-blur-sm text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary-500/30"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon icon="solar:link-bold" className="size-5" />
                  <span>방문하기</span>
                </Link>
              )}
            </div>

            {(period || role || company) && (
              <div className="pt-4 space-y-2.5 text-sm">
                {period && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary-100/80 dark:bg-primary-900/30">
                      <Icon icon="solar:calendar-bold" className="size-4 shrink-0 text-primary-600 dark:text-primary-400" />
                    </div>
                    <span className="font-medium">{period}</span>
                  </div>
                )}
                {role && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary-100/80 dark:bg-primary-900/30">
                      <Icon icon="solar:user-bold" className="size-4 shrink-0 text-primary-600 dark:text-primary-400" />
                    </div>
                    <span className="font-medium">{role}</span>
                  </div>
                )}
                {company && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary-100/80 dark:bg-primary-900/30">
                      <Icon icon="solar:buildings-2-bold" className="size-4 shrink-0 text-primary-600 dark:text-primary-400" />
                    </div>
                    <span className="font-medium">{company}</span>
                  </div>
                )}
              </div>
            )}

            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-primary-200/50 dark:border-primary-800/50 text-primary-700 dark:text-primary-300 font-semibold shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </DialogHeader>

          <div className="prose dark:prose-invert max-w-none px-6 pb-6 text-gray-700 dark:text-gray-300">
            <MDXLayoutRenderer code={project.body.code} components={modalComponents} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ProjectCard

