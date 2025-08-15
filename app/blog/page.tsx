import { Metadata } from 'next'
import { BlogLayout } from '@/components/blog/blog-layout'
import { BlogHero } from '@/components/blog/blog-hero'
import { BlogCategories } from '@/components/blog/blog-categories'
import { BlogSearch } from '@/components/blog/blog-search'
import { BlogGrid } from '@/components/blog/blog-grid'
import { createClient } from '@/lib/supabase/server'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Blog | SocialCal - Social Media Tips & Marketing Insights',
  description: 'Learn social media best practices, marketing strategies, and get the latest updates from SocialCal.',
  openGraph: {
    title: 'Blog | SocialCal',
    description: 'Learn social media best practices, marketing strategies, and get the latest updates from SocialCal.',
    type: 'website',
  },
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { category?: string; search?: string; page?: string }
}) {
  try {
    const supabase = createClient()
    const page = parseInt(searchParams.page || '1')
    const limit = 9
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        author:blog_authors(display_name, avatar_url)
      `, { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    // Apply category filter
    if (searchParams.category) {
      query = query.eq('category', searchParams.category)
    }

    // Apply search filter
    if (searchParams.search) {
      query = query.or(`title.ilike.%${searchParams.search}%,excerpt.ilike.%${searchParams.search}%`)
    }

    // Fetch posts with pagination
    const { data: posts, count, error: postsError } = await query
      .range(offset, offset + limit - 1)

    if (postsError) {
      console.error('Error fetching blog posts:', postsError)
    }

    // Fetch featured post for hero
    const { data: featuredPost, error: featuredError } = await supabase
      .from('blog_posts')
      .select(`
        *,
        author:blog_authors(display_name, avatar_url)
      `)
      .eq('status', 'published')
      .eq('featured', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .single()

    if (featuredError && featuredError.code !== 'PGRST116') {
      console.error('Error fetching featured post:', featuredError)
    }

    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from('blog_categories')
      .select('*')
      .order('order_index')

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
    }

    const totalPages = Math.ceil((count || 0) / limit)

  return (
    <BlogLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section with Featured Post */}
        {featuredPost && !searchParams.category && !searchParams.search && page === 1 && (
          <BlogHero post={featuredPost} />
        )}

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          {/* Page Header - Left Aligned */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-left">
              {searchParams.category ? 
                categories?.find(c => c.slug === searchParams.category)?.name || 'Blog' 
                : 'Latest from SocialCal'}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl text-left">
              Discover social media tips, marketing strategies, and product updates to help you grow your online presence.
            </p>
          </div>

          {/* Blog Posts Grid */}
          <BlogGrid 
            posts={posts || []}
            currentPage={page}
            totalPages={totalPages}
            searchParams={searchParams}
          />
        </div>
      </div>
    </BlogLayout>
  )
  } catch (error) {
    console.error('Error loading blog page:', error)
    
    // Fallback UI when there's an error
    return (
      <BlogLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Blog Coming Soon
              </h1>
              <p className="text-gray-600">
                We&apos;re working on bringing you great content. Please check back later.
              </p>
            </div>
          </div>
        </div>
      </BlogLayout>
    )
  }
}