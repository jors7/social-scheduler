import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { BlogLayoutServer } from '@/components/blog/blog-layout-server'
import { BlogPostHeader } from '@/components/blog/blog-post-header'
import { BlogPostContent } from '@/components/blog/blog-post-content'
import { RelatedPosts } from '@/components/blog/related-posts'
import { BlogTableOfContents } from '@/components/blog/blog-table-of-contents'
import { BlogShareButtons } from '@/components/blog/blog-share-buttons'

// Dynamic in development, ISR in production
export const revalidate = process.env.NODE_ENV === 'development' ? 0 : 60
export const dynamicParams = true // Allow new slugs to be generated on-demand

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
    .select(`
      title,
      excerpt,
      featured_image,
      published_at,
      updated_at,
      category,
      author:blog_authors(display_name)
    `)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()

  if (!post) {
    return {
      title: 'Post Not Found | SocialCal Blog',
    }
  }

  const author = Array.isArray(post.author) ? post.author[0] : post.author
  const categoryName = post.category?.replace(/-/g, ' ') || 'Blog'

  // JSON-LD structured data for better SEO
  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.featured_image,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      '@type': 'Person',
      name: author?.display_name || 'SocialCal Team'
    },
    publisher: {
      '@type': 'Organization',
      name: 'SocialCal',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.socialcal.app/icon.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.socialcal.app/blog/${params.slug}`
    }
  }

  // Breadcrumb schema for better SEO
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.socialcal.app'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://www.socialcal.app/blog'
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryName,
        item: `https://www.socialcal.app/blog/${params.slug}`
      }
    ]
  }

  return {
    title: `${post.title} | SocialCal Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.featured_image ? [post.featured_image] : undefined,
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at || post.published_at,
      authors: author?.display_name ? [author.display_name] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.featured_image ? [post.featured_image] : undefined,
    },
    alternates: {
      canonical: `https://www.socialcal.app/blog/${params.slug}`,
    },
    other: {
      'script:ld+json': JSON.stringify([blogPostingSchema, breadcrumbSchema])
    }
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

  // First, try to fetch the blog post with author details
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select(`
      *,
      author:blog_authors(*)
    `)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()

  // If post not found, check if there's a redirect for this slug
  if (error || !post) {
    const { data: redirectData } = await supabase
      .from('blog_slug_redirects')
      .select('new_slug')
      .eq('old_slug', params.slug)
      .single()

    if (redirectData) {
      // Redirect to the new slug
      redirect(`/blog/${redirectData.new_slug}`)
    }

    // No post and no redirect found
    notFound()
  }

  // OPTIMIZED: Run view count increment and related posts fetch in parallel
  // View count doesn't need to block rendering
  const [, relatedPostsResult] = await Promise.all([
    supabase.rpc('increment_post_view_count', { post_id: post.id }),
    supabase
      .from('blog_posts')
      .select(`
        id,
        slug,
        title,
        excerpt,
        featured_image,
        featured_image_blur,
        published_at,
        reading_time,
        author:blog_authors(display_name, avatar_url)
      `)
      .eq('status', 'published')
      .eq('category', post.category)
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(3)
  ])

  const relatedPostsData = relatedPostsResult.data

  // Transform the data to match the expected type
  const relatedPosts = relatedPostsData?.map(post => ({
    ...post,
    author: Array.isArray(post.author) ? post.author[0] : post.author
  }))

  // Generate table of contents from content
  const headings = extractHeadings(post.content)

  return (
    <BlogLayoutServer>
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
                  <div className="sticky top-20" style={{ marginTop: '0' }}>
                    <BlogTableOfContents headings={headings} />
                  </div>
                </aside>

                {/* Main Content */}
                <div className="lg:col-span-9">
                  <BlogPostContent content={post.content} headings={headings} />
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
    </BlogLayoutServer>
  )
}

function extractHeadings(content: string) {
  // Simple heading extraction - enhance based on your content structure
  const headingRegex = /<h([2-3])[^>]*>(.*?)<\/h\1>/gi
  const headings = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, '') // Strip HTML tags
    headings.push({
      level: parseInt(match[1]),
      text: text,
      id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    })
  }

  return headings
}