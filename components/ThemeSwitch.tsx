'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()

  // When mounted on client, now we can show the UI
  useEffect(() => setMounted(true), [])

  const toggleTheme = () => {
    const currentTheme = theme || 'system'
    if (currentTheme === 'light') {
      setTheme('dark')
    } else if (currentTheme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getIcon = () => {
    if (!mounted) return <div className="h-5 w-5" />

    const currentTheme = theme || 'system'
    if (currentTheme === 'system') {
      return <Icon icon="solar:monitor-bold" className="h-5 w-5" />
    }
    return resolvedTheme === 'dark' ? (
      <Icon icon="solar:moon-bold" className="h-5 w-5" />
    ) : (
      <Icon icon="solar:sun-bold" className="h-5 w-5" />
    )
  }

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="flex items-center justify-center"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {getIcon()}
    </motion.button>
  )
}

export default ThemeSwitch
