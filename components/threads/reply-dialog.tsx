'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { MessageCircle, X } from 'lucide-react'

interface ThreadsReplyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  postText: string
  accountId?: string
  onSuccess?: () => void
}

export function ThreadsReplyDialog({
  open,
  onOpenChange,
  postId,
  postText,
  accountId,
  onSuccess
}: ThreadsReplyDialogProps) {
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const maxLength = 500 // Threads character limit
  const remainingChars = maxLength - replyText.length

  const handleSubmit = async () => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply')
      return
    }

    if (replyText.length > maxLength) {
      toast.error(`Reply must be ${maxLength} characters or less`)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/threads/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          replyText,
          accountId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post reply')
      }

      toast.success('Reply posted successfully!')
      setReplyText('')
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('Error posting reply:', error)
      toast.error(error.message || 'Failed to post reply')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setReplyText('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Reply to Thread
          </DialogTitle>
          <DialogDescription>
            Post a reply to this Threads post
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original Post Preview */}
          <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1 font-medium">Replying to:</p>
            <p className="text-sm text-gray-800 line-clamp-3">
              {postText || 'This post'}
            </p>
          </div>

          {/* Reply Text Area */}
          <div className="space-y-2">
            <Textarea
              placeholder="Write your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isSubmitting}
              maxLength={maxLength}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                Reply will be posted to Threads
              </span>
              <span
                className={`font-medium ${
                  remainingChars < 50
                    ? 'text-orange-600'
                    : remainingChars < 20
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {remainingChars} characters remaining
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !replyText.trim()}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Posting...' : 'Post Reply'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
