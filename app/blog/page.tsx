import { createClient } from '@supabase/supabase-js'
import { BlogLayout } from '@/components/blog/blog-layout'
import { BlogGrid } from '@/components/blog/blog-grid'
import { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, Clock, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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
  let featuredPost = null
  let error = null
  
  try {
    const supabase = getSupabaseClient()
    
    // Fetch featured post
    const { data: featuredData, error: featuredError } = await supabase
      .from('blog_posts')
      .select(`
        *,
        author:blog_authors(display_name, avatar_url)
      `)
      .eq('status', 'published')
      .eq('featured', true)
      .single()
    
    if (!featuredError && featuredData) {
      featuredPost = {
        ...featuredData,
        author: Array.isArray(featuredData.author) ? featuredData.author[0] : featuredData.author
      }
    }
    
    // Fetch regular posts
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
        {/* Hero Section with Breadcrumbs and Featured Post */}
        <section className="relative bg-gradient-to-b from-gray-900 to-gray-800 text-white overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="container mx-auto px-4 py-12 relative z-10">
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-sm mb-6">
              <a href="/" className="text-gray-300 hover:text-white transition-colors">
                Home
              </a>
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-white font-medium">Blog</span>
            </nav>

            {/* Featured Post Content */}
            {featuredPost ? (
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Text Content */}
                <div className="space-y-6">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                    <Link href={`/blog/${featuredPost.slug}`} className="hover:text-blue-400 transition-colors">
                      {featuredPost.title}
                    </Link>
                  </h1>
                  
                  <p className="text-xl text-gray-300 leading-relaxed">
                    {featuredPost.excerpt}
                  </p>

                  {/* Post Meta */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    {featuredPost.author?.avatar_url && (
                      <div className="flex items-center gap-2">
                        <img
                          src={featuredPost.author.avatar_url}
                          alt={featuredPost.author.display_name}
                          className="w-8 h-8 rounded-full"
                        />
                        <span>{featuredPost.author.display_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDistanceToNow(new Date(featuredPost.published_at), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{featuredPost.reading_time} min read</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Link
                      href={`/blog/${featuredPost.slug}`}
                      className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Read Article
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </div>
                </div>

                {/* Featured Image */}
                {featuredPost.featured_image && (
                  <div className="relative group">
                    <Link href={`/blog/${featuredPost.slug}`}>
                      <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                        <img
                          src={featuredPost.featured_image}
                          alt={featuredPost.title}
                          className="w-full h-[400px] object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback if no featured post */
              <div className="max-w-4xl">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  Social Media Insights & Updates
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Discover the latest tips, strategies, and product updates to help you master social media marketing and grow your online presence.
                </p>
              </div>
            )}
          </div>
        </section>
        
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