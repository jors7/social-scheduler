'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BlogLayout } from '@/components/blog/blog-layout'
import { BlogGrid } from '@/components/blog/blog-grid'

export default function ClientBlogPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:blog_authors(display_name, avatar_url)
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(9)
      
      if (error) {
        setError(error)
      } else {
        // Process the data to handle author arrays
        const processedPosts = data?.map(post => ({
          ...post,
          author: Array.isArray(post.author) ? post.author[0] : post.author
        }))
        setPosts(processedPosts || [])
      }
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <BlogLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Loading...</h1>
            </div>
          </div>
        </div>
      </BlogLayout>
    )
  }

  if (error) {
    return (
      <BlogLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Error Loading Blog</h1>
              <pre className="text-left bg-red-50 p-4 rounded max-w-2xl mx-auto text-sm">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </BlogLayout>
    )
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

          <BlogGrid 
            posts={posts}
            currentPage={1}
            totalPages={1}
            searchParams={{}}
          />
        </div>
      </div>
    </BlogLayout>
  )
}