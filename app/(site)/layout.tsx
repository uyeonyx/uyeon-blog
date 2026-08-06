import SiteChrome from '@/components/SiteChrome'
import { TagLabelsProvider } from '@/components/TagLabelsProvider'
import { getTagLabels } from '@/lib/db/tags'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const tagLabels = await getTagLabels()
  return (
    <TagLabelsProvider labels={tagLabels}>
      <SiteChrome>{children}</SiteChrome>
    </TagLabelsProvider>
  )
}
