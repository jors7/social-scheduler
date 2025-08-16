import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { BlogLayout } from '@/components/blog/blog-layout'
import { BlogPostHeader } from '@/components/blog/blog-post-header'
import { BlogPostContent } from '@/components/blog/blog-post-content'
import { RelatedPosts } from '@/components/blog/related-posts'
import { BlogTableOfContents } from '@/components/blog/blog-table-of-contents'
import { BlogShareButtons } from '@/components/blog/blog-share-buttons'

// Static generation with ISR - revalidate every 60 seconds
export const revalidate = 60

// Create a direct Supabase client for build-time data fetching
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

interface BlogPostPageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const supabase = getSupabaseClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, featured_image')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()

  if (!post) {
    return {
      title: 'Post Not Found | SocialCal Blog',
    }
  }

  return {
    title: `${post.title} | SocialCal Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.featured_image ? [post.featured_image] : undefined,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.featured_image ? [post.featured_image] : undefined,
    },
  }
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  const supabase = getSupabaseClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('status', 'published')
  
  return posts?.map((post) => ({
    slug: post.slug,
  })) || []
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const supabase = getSupabaseClient()

  // Fetch the blog post with author details
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select(`
      *,
      author:blog_authors(*)
    `)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()

  if (error || !post) {
    notFound()
  }

  // Increment view count
  await supabase.rpc('increment_post_view_count', { post_id: post.id })

  // Fetch related posts
  const { data: relatedPostsData } = await supabase
    .from('blog_posts')
    .select(`
      id,
      slug,
      title,
      excerpt,
      featured_image,
      published_at,
      reading_time,
      author:blog_authors(display_name, avatar_url)
    `)
    .eq('status', 'published')
    .eq('category', post.category)
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(3)

  // Transform the data to match the expected type
  const relatedPosts = relatedPostsData?.map(post => ({
    ...post,
    author: Array.isArray(post.author) ? post.author[0] : post.author
  }))

  // Generate table of contents from content
  const headings = extractHeadings(post.content)

  return (
    <BlogLayout>
      <article className="min-h-screen bg-white">
        {/* Content Container */}
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Post Header with Featured Image - Full Width */}
            <BlogPostHeader post={post} />
            
            {/* Narrower Content Container for Article Body */}
            <div className="max-w-4xl mx-auto">
              {/* Main Content with Table of Contents */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8">
                {/* Table of Contents - Desktop Only */}
                <aside className="hidden lg:block lg:col-span-3">
                  <div className="sticky top-24">
                    <BlogTableOfContents headings={headings} />
                  </div>
                </aside>

                {/* Main Content */}
                <div className="lg:col-span-9">
                  <BlogPostContent content={post.content} />
                </div>
              </div>

              {/* Share Buttons */}
              <BlogShareButtons 
                url={`${process.env.NEXT_PUBLIC_APP_URL}/blog/${post.slug}`}
                title={post.title}
              />

              {/* Related Posts */}
              {relatedPosts && relatedPosts.length > 0 && (
                <RelatedPosts posts={relatedPosts} />
              )}
            </div>
          </div>
        </div>
      </article>
    </BlogLayout>
  )
}

function extractHeadings(content: string) {
  // Simple heading extraction - enhance based on your content structure
  const headingRegex = /<h([2-3])[^>]*>(.*?)<\/h\1>/gi
  const headings = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      text: match[2].replace(/<[^>]*>/g, ''), // Strip HTML tags
      id: match[2].toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    })
  }

  return headings
}