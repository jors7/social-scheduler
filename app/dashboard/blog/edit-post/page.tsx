'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function EditPostPage() {
  const [loading, setLoading] = useState(true)
  const [post, setPost] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const postId = searchParams.get('id')
  const supabase = createClient()

  useEffect(() => {
    if (postId) {
      loadPost()
    } else {
      toast.error('No post ID provided')
      router.push('/dashboard/blog')
    }
  }, [postId])

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (error) throw error
      setPost(data)
    } catch (error) {
      console.error('Error loading post:', error)
      toast.error('Failed to load blog post')
      router.push('/dashboard/blog')
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
      
      <h1 className="text-3xl font-bold mb-4">Edit Blog Post</h1>
      
      {post && (
        <div className="space-y-4">
          <div>
            <strong>Title:</strong> {post.title}
          </div>
          <div>
            <strong>Status:</strong> {post.status}
          </div>
          <div>
            <strong>Content Preview:</strong>
            <div className="mt-2 p-4 border rounded">
              {post.content?.substring(0, 200)}...
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Full editor coming soon. For now, you can view the post details.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}