'use client'

import { Icon } from '@iconify/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false)
  const { setTheme, resolvedTheme } = useTheme()

  // When mounted on client, now we can show the UI
  useEffect(() => setMounted(true), [])

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Theme switcher"
            className="hover:text-primary-500 dark:hover:text-primary-400 flex items-center justify-center"
          >
            {mounted ? (
              resolvedTheme === 'dark' ? (
                <Icon icon="solar:moon-bold" className="h-6 w-6" />
              ) : (
                <Icon icon="solar:sun-bold" className="h-6 w-6" />
              )
            ) : (
              <div className="h-6 w-6" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Icon icon="solar:sun-bold" className="mr-2 h-4 w-4" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Icon icon="solar:moon-bold" className="mr-2 h-4 w-4" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Icon icon="solar:monitor-bold" className="mr-2 h-4 w-4" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default ThemeSwitch
