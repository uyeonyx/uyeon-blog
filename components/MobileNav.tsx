'use client'

// Radix Dialog(Sheet) 기반 모바일 메뉴 — 수제 드롭다운이 갖추지 못했던
// 포커스 트랩·Escape 닫기·aria-expanded/controls·포커스 복귀를 프리미티브가 제공한다.
import { Icon } from '@iconify/react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import navLinks from '@/data/headerNavLinks'
import { useI18n } from '@/lib/i18n/i18n-context'
import LanguageSwitch from './LanguageSwitch'
import Link from './Link'
import SearchButton from './SearchButton'
import ThemeSwitch from './ThemeSwitch'

const ACTION_SLOT =
  'flex-1 flex justify-center [&>button]:w-full [&>button]:text-gray-700 [&>button]:dark:text-gray-200 [&>button]:hover:text-gray-900 [&>button]:dark:hover:text-white [&>button]:hover:bg-gray-100 [&>button]:dark:hover:bg-white/10 [&>button]:rounded-lg [&>button]:p-2.5 [&>button]:transition-colors [&>button]:active:bg-gray-200 [&>button]:dark:active:bg-white/20'

const MobileNav = () => {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()

  return (
    <div className="relative md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={t('common.toggleMenu')}
            className="p-2.5 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-900/5 dark:hover:bg-white/10 rounded-full transition-colors border border-gray-300/50 dark:border-gray-500/50"
          >
            <Icon
              icon={open ? 'solar:close-circle-bold' : 'solar:hamburger-menu-bold'}
              className="h-6 w-6"
            />
          </button>
        </SheetTrigger>
        <SheetContent
          side="top"
          // 트리거 버튼이 열림/닫힘 아이콘을 겸하므로 내장 X는 끈다 (첫 링크와 겹침)
          showClose={false}
          className="inset-x-auto top-[6rem] left-1/2 h-auto w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/40 dark:border-gray-600 dark:bg-gray-800 dark:shadow-black/60"
        >
          <SheetTitle className="sr-only">{t('common.toggleMenu')}</SheetTitle>
          {/* Subtle Gradient Background */}
          <div className="absolute inset-0 bg-linear-to-br from-primary-500/5 via-transparent to-primary-600/5" />

          <div className="relative space-y-1 p-4">
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center rounded-xl px-4 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white dark:active:bg-white/20"
                    onClick={() => setOpen(false)}
                  >
                    {t(link.key)}
                  </Link>
                </div>
              ))}
            </nav>

            <div className="my-2 h-px bg-linear-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600" />

            <div className="flex items-center justify-around gap-2 px-2 py-2">
              <div className={ACTION_SLOT}>
                <SearchButton />
              </div>
              <div
                className={`${ACTION_SLOT} [&>button]:border [&>button]:border-gray-200 [&>button]:dark:border-gray-600/50`}
              >
                <LanguageSwitch />
              </div>
              <div
                className={`${ACTION_SLOT} [&>button]:border [&>button]:border-gray-200 [&>button]:dark:border-gray-600/50`}
              >
                <ThemeSwitch />
              </div>
              <div className="flex flex-1 justify-center">
                <Link
                  href="/admin"
                  aria-label="작성자 모드"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center rounded-lg border border-gray-200 p-2.5 text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 dark:border-gray-600/50 dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white dark:active:bg-white/20"
                >
                  <Icon icon="solar:pen-2-bold" className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default MobileNav
