/* eslint-disable jsx-a11y/anchor-has-content */
'use client'

import type { LinkProps } from 'next/link'
import Link from 'next/link'
import type { AnchorHTMLAttributes } from 'react'
import { useI18n } from '@/lib/i18n/i18n-context'
import { withLocale } from '@/lib/i18n/paths'

/**
 * 내부 절대경로에 현재 로케일 접두사를 자동으로 붙이는 단일 지점.
 * withLocale이 멱등이고 프로토콜 경로(/api, /llms.txt 등)를 면제하므로
 * 호출부는 로케일을 몰라도 된다.
 */
const CustomLink = ({ href, ...rest }: LinkProps & AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const { locale } = useI18n()
  const isInternalLink = typeof href === 'string' && href.startsWith('/')
  const isAnchorLink = typeof href === 'string' && href.startsWith('#')

  if (isInternalLink) {
    return <Link className="break-words" href={withLocale(href, locale)} {...rest} />
  }

  if (isAnchorLink) {
    return <a className="break-words" href={href} {...rest} />
  }

  return (
    <a className="break-words" target="_blank" rel="noopener noreferrer" href={href} {...rest} />
  )
}

export default CustomLink
