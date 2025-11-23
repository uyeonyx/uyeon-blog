import { genPageMetadata } from 'app/seo'
import AboutPageClient from './AboutPageClient'

export const metadata = genPageMetadata({ title: 'About' })

export default function Page() {
  return <AboutPageClient />
}
