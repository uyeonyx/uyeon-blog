// 헤더/모바일 내비 공용 정의. title은 i18n 키이고 href는 로케일 접두사가 없는 경로다
// (components/Link가 렌더 시점에 접두사를 붙인다).
const headerNavLinks = [
  { href: '/', key: 'common.home' },
  { href: '/blog', key: 'common.blog' },
  { href: '/tags', key: 'common.tags' },
  { href: '/projects', key: 'common.projects' },
  { href: '/about', key: 'common.about' },
]

export default headerNavLinks
