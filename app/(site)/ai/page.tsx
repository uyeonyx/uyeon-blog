import { genPageMetadata } from 'app/seo'
import AiPageClient from './AiPageClient'

export const metadata = genPageMetadata({ title: 'AI' })

export default function Page() {
  return <AiPageClient />
}
