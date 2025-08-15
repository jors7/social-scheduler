import { createClient } from '@supabase/supabase-js'
import { BlogLayout } from '@/components/blog/blog-layout'
import { BlogGrid } from '@/components/blog/blog-grid'

// Create a direct Supabase client for server-side rendering
// This avoids cookie dependencies that cause issues on Vercel
function createServerClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

// Mark as dynamic to ensure server-side rendering
export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate every 60 seconds

export default async function BlogPage() {
  try {
    const supabase = createServerClient()
    
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        author:blog_authors(display_name, avatar_url)
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(9)
    
    if (error) {
      console.error('Error fetching blog posts:', error)
      return (
        <BlogLayout>
          <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="container mx-auto px-4 py-12">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Error Loading Blog</h1>
                <p className="text-gray-600">We&apos;re having trouble loading our blog posts. Please try again later.</p>
              </div>
            </div>
          </div>
        </BlogLayout>
      )
    }
    
    // Process the data to handle author arrays
    const processedPosts = posts?.map(post => ({
      ...post,
      author: Array.isArray(post.author) ? post.author[0] : post.author
    })) || []
    
    return (
      <BlogLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-12">
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-left">
                Latest from SocialCal
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl text-left">
                Discover social media tips, marketing strategies, and product updates to help you grow your online presence.
              </p>
            </div>

            <BlogGrid 
              posts={processedPosts}
              currentPage={1}
              totalPages={1}
              searchParams={{}}
            />
          </div>
        </div>
      </BlogLayout>
    )
  } catch (error) {
    console.error('Unexpected error in blog page:', error)
    return (
      <BlogLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Something went wrong</h1>
              <p className="text-gray-600">We&apos;re having trouble loading our blog. Please try again later.</p>
            </div>
          </div>
        </div>
      </BlogLayout>
    )
  }
}