import TagsManager from '@/components/admin/TagsManager'
import { listTagUsage } from '@/lib/admin/tag-service'

export const metadata = { title: '태그 관리' }

export default async function AdminTagsPage() {
  const items = await listTagUsage()
  return <TagsManager initialItems={items} />
}
