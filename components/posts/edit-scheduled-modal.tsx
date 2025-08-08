'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Calendar, Clock, Loader2 } from 'lucide-react'

interface EditScheduledModalProps {
  postId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditScheduledModal({ 
  postId, 
  open, 
  onOpenChange,
  onSuccess 
}: EditScheduledModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [post, setPost] = useState<any>(null)
  const [content, setContent] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')

  useEffect(() => {
    if (open && postId) {
      loadPost()
    }
  }, [open, postId])

  const loadPost = async () => {
    if (!postId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/posts/scheduled/${postId}`)
      if (!response.ok) {
        throw new Error('Failed to load post')
      }
      const data = await response.json()
      setPost(data)
      setContent(data.content)
      
      // Format datetime for input
      const date = new Date(data.scheduled_for)
      const formatted = format(date, "yyyy-MM-dd'T'HH:mm")
      setScheduledFor(formatted)
    } catch (error) {
      console.error('Load post error:', error)
      toast.error('Failed to load post')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!postId) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/posts/scheduled/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          scheduled_for: new Date(scheduledFor).toISOString()
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update post')
      }

      toast.success('Post updated successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update post')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!postId) return
    
    if (!confirm('Are you sure you want to delete this scheduled post?')) {
      return
    }
    
    setSaving(true)
    try {
      const response = await fetch(`/api/posts/scheduled/${postId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete post')
      }

      toast.success('Post deleted successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete post')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Scheduled Post</DialogTitle>
          <DialogDescription>
            Make changes to your scheduled post. You can only edit posts that haven&apos;t been published yet.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : post ? (
          <div className="space-y-4">
            {/* Platforms */}
            <div>
              <Label>Platforms</Label>
              <div className="flex gap-2 mt-2">
                {post.platforms?.map((platform: string) => (
                  <span 
                    key={platform}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="mt-2"
                placeholder="What's on your mind?"
              />
            </div>

            {/* Schedule Time */}
            <div>
              <Label htmlFor="scheduled">
                <Calendar className="inline h-4 w-4 mr-1" />
                Scheduled For
              </Label>
              <Input
                id="scheduled"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="mt-2"
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              />
            </div>

            {/* Status */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{post.status}</span>
              </div>
              {post.error && (
                <div className="mt-2 text-sm text-destructive">
                  Error: {post.error}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={saving || loading}
          >
            Delete Post
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || loading || !content || !scheduledFor}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}