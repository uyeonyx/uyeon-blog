'use client'

import { MotionConfig } from 'framer-motion'

/** OS의 '동작 줄이기' 설정을 모든 framer-motion 애니메이션에 일괄 반영한다 (WCAG 2.3.3) */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
