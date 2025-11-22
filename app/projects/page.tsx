import { genPageMetadata } from 'app/seo'
import ProjectsPageClient from './ProjectsPageClient'

export const metadata = genPageMetadata({ title: 'Projects' })

export default function Projects() {
  return <ProjectsPageClient />
}
