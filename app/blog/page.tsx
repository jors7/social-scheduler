import { createClient } from '@supabase/supabase-js'
import { BlogLayout } from '@/components/blog/blog-layout'
import { BlogGrid } from '@/components/blog/blog-grid'
import { Metadata } from 'next'

// Static generation with ISR - revalidate every 60 seconds
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Blog | SocialCal',
  description: 'Discover social media tips, marketing strategies, and product updates to help you grow your online presence.',
}

// Create Supabase client at build time
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

export default async function BlogPage() {
  let posts = []
  let error = null
  
  try {
    const supabase = getSupabaseClient()
    const { data, error: fetchError } = await supabase
      .from('blog_posts')
      .select(`
        *,
        author:blog_authors(display_name, avatar_url)
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(9)
    
    if (fetchError) {
      console.error('Blog fetch error:', fetchError)
      error = fetchError
    } else {
      // Process the data to handle author arrays
      posts = data?.map(post => ({
        ...post,
        author: Array.isArray(post.author) ? post.author[0] : post.author
      })) || []
    }
  } catch (err) {
    console.error('Error fetching blog posts:', err)
    error = err
  }
  
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

          {error ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Unable to load blog posts. Please try refreshing the page.</p>
            </div>
          ) : (
            <BlogGrid 
              posts={posts}
              currentPage={1}
              totalPages={1}
              searchParams={{}}
            />
          )}
        </div>
      </div>
    </BlogLayout>
  )
}