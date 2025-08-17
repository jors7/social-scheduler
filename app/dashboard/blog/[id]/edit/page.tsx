'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function SimpleEditBlogPostPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [post, setPost] = useState<any>(null)
  
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  useEffect(() => {
    loadPost()
  }, [postId])

  const loadPost = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/blog/${postId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load post')
      }
      
      setPost(data.post)
    } catch (err) {
      console.error('Error loading post:', err)
      setError(err instanceof Error ? err.message : 'Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard/blog')}>
            Back to Blog Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/blog')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blog Dashboard
        </Button>
      </div>
      
      <h1 className="text-3xl font-bold mb-4">Edit Blog Post (Simplified)</h1>
      
      {post && (
        <div className="space-y-4">
          <div>
            <strong>ID:</strong> {post.id}
          </div>
          <div>
            <strong>Title:</strong> {post.title}
          </div>
          <div>
            <strong>Slug:</strong> {post.slug}
          </div>
          <div>
            <strong>Status:</strong> {post.status}
          </div>
          <div>
            <strong>Content Length:</strong> {post.content?.length || 0} characters
          </div>
        </div>
      )}
    </div>
  )
}