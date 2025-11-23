'use client'

import { motion } from 'framer-motion'
import HeaderClient from './HeaderClient'

const Header = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <HeaderClient />
    </motion.div>
  )
}

export default Header
