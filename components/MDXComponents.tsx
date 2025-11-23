import type { MDXComponents } from 'mdx/types'
import BlogNewsletterForm from 'pliny/ui/BlogNewsletterForm'
import TOCInline from 'pliny/ui/TOCInline'
import Image from './Image'
import IntroCard from './IntroCard'
import CustomLink from './Link'
import Pre from './Pre'
import TableWrapper from './TableWrapper'
import TechStack from './TechStack'
import Timeline from './Timeline'

export const components: MDXComponents = {
  Image,
  TOCInline,
  a: CustomLink,
  pre: Pre,
  table: TableWrapper,
  BlogNewsletterForm,
  TechStack,
  IntroCard,
  Timeline,
}
