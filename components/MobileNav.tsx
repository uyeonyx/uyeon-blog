'use client'

import { Icon } from '@iconify/react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import headerNavLinks from '@/data/headerNavLinks'
import Link from './Link'

const MobileNav = () => {
  const [navShow, setNavShow] = useState(false)

  return (
    <Sheet open={navShow} onOpenChange={setNavShow}>
      <SheetTrigger asChild>
        <button type="button" aria-label="Toggle Menu" className="sm:hidden">
          <Icon
            icon="solar:hamburger-menu-bold"
            className="hover:text-primary-500 dark:hover:text-primary-400 h-8 w-8 text-gray-900 dark:text-gray-100"
          />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full bg-white/95 dark:bg-gray-950/98">
        <SheetHeader>
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        </SheetHeader>
        <nav className="mt-8 flex h-full basis-0 flex-col items-start overflow-y-auto pt-2 text-left">
          {headerNavLinks.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className="hover:text-primary-500 dark:hover:text-primary-400 mb-4 py-2 pr-4 text-2xl font-bold tracking-widest text-gray-900 outline-0 dark:text-gray-100"
              onClick={() => setNavShow(false)}
            >
              {link.title}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

export default MobileNav
