import { genPageMetadata } from 'app/seo'
import { allBlogs } from 'contentlayer/generated'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import BlogPageClient from '../../BlogPageClient'

const POSTS_PER_PAGE = 5

export const metadata = genPageMetadata({ title: 'Blog' })

export const generateStaticParams = async () => {
  const totalPosts = allBlogs.filter((post) => !post.draft)
  const totalPages = Math.ceil(totalPosts.length / POSTS_PER_PAGE)
  const paths = Array.from({ length: totalPages }, (_, i) => ({ page: (i + 1).toString() }))

  return paths
}

export default async function Page(props: { params: Promise<{ page: string }> }) {
  const params = await props.params
  const posts = allCoreContent(sortPosts(allBlogs))
  const pageNumber = Number.parseInt(params.page, 10)

  return <BlogPageClient allPosts={posts} postsPerPage={POSTS_PER_PAGE} pageNumber={pageNumber} />
}
