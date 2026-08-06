/** uy 리가처 브랜드 마크. 라이트 모드에선 한 단계 진한 톤으로 전환된다. */
const Logo = ({ className = '' }: { className?: string }) => (
  <svg viewBox="9.5 10.5 45 42" aria-hidden="true" className={className}>
    <path
      d="M32 19 v13 a9 9 0 0 0 18 0 v-13 M50 19 v20 a9 9 0 0 1 -9 9 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-sky-800 dark:text-sky-600"
    />
    <path
      d="M14 15 v13 a9 9 0 0 0 18 0 v-13"
      fill="none"
      stroke="currentColor"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-cyan-600 dark:text-sky-300"
    />
  </svg>
)

export default Logo
