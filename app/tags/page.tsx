import { genPageMetadata } from 'app/seo'
import TagsPageClient from './TagsPageClient'

export const metadata = genPageMetadata({ title: 'Tags', description: 'Things I blog about' })

export default async function Page() {
  return <TagsPageClient />
}
