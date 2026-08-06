import AboutEditor, { type AboutEditorData } from '@/components/admin/AboutEditor'
import { getAuthorForEdit } from '@/lib/admin/author-service'

export const metadata = { title: '소개 편집' }

export default async function EditAboutPage() {
  const { author, translations } = await getAuthorForEdit('default')

  const initial: AboutEditorData = {
    id: author.id,
    avatarUrl: author.avatarUrl,
    email: author.email,
    github: author.github,
    linkedin: author.linkedin,
    twitter: author.twitter,
    bluesky: author.bluesky,
    translations: Object.fromEntries(
      translations.map((t) => [
        t.language,
        {
          name: t.name,
          occupation: t.occupation,
          company: t.company,
          techStack: t.techStack,
          timeline: t.timeline,
          contentJson: t.contentJson,
        },
      ])
    ),
  }

  return <AboutEditor initial={initial} />
}
