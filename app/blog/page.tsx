import { genPageMetadata } from 'app/seo'
import { allBlogs } from 'contentlayer/generated'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import BlogPageClient from './BlogPageClient'

const POSTS_PER_PAGE = 5

export const metadata = genPageMetadata({ title: 'Blog' })

export default async function BlogPage(_props: { searchParams: Promise<{ page: string }> }) {
  const posts = allCoreContent(sortPosts(allBlogs))
  const pageNumber = 1

  return <BlogPageClient allPosts={posts} postsPerPage={POSTS_PER_PAGE} pageNumber={pageNumber} />
}
