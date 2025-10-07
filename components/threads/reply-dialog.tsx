'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { MessageCircle, X, Image as ImageIcon, Video, Upload, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxLength = 500 // Threads character limit
  const remainingChars = maxLength - replyText.length

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm']
    const isValidImage = validImageTypes.includes(file.type)
    const isValidVideo = validVideoTypes.includes(file.type)

    if (!isValidImage && !isValidVideo) {
      toast.error('Please select a valid image (JPG, PNG) or video (MP4, MOV) file')
      return
    }

    // Validate file size (max 100MB for videos, 10MB for images)
    const maxSize = isValidVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error(`File too large. Max ${isValidVideo ? '100MB' : '10MB'}`)
      return
    }

    setMediaFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeMedia = () => {
    setMediaFile(null)
    setMediaPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadMediaToSupabase = async (file: File): Promise<string> => {
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { data, error } = await supabase.storage
      .from('post-media')
      .upload(filePath, file)

    if (error) {
      throw new Error('Failed to upload media')
    }

    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(filePath)

    return publicUrl
  }

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
      let mediaUrl: string | undefined

      // Upload media if present
      if (mediaFile) {
        setIsUploading(true)
        toast.loading('Uploading media...')
        mediaUrl = await uploadMediaToSupabase(mediaFile)
        toast.dismiss()
      }

      const response = await fetch('/api/threads/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          replyText,
          accountId,
          mediaUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post reply')
      }

      // Show success with link to view on Threads
      if (data.permalink) {
        toast.success(
          <div className="flex flex-col gap-2">
            <p>Reply posted successfully!</p>
            <a
              href={data.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline text-sm font-medium"
            >
              View Reply on Threads →
            </a>
          </div>,
          { duration: 8000 }
        )
      } else {
        toast.success('Reply posted successfully!')
      }

      setReplyText('')
      setMediaFile(null)
      setMediaPreview(null)
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('Error posting reply:', error)
      toast.error(error.message || 'Failed to post reply')
    } finally {
      setIsSubmitting(false)
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting && !isUploading) {
      setReplyText('')
      setMediaFile(null)
      setMediaPreview(null)
      onOpenChange(false)
    }
  }

  const isVideo = mediaFile?.type.startsWith('video/')

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
              disabled={isSubmitting || isUploading}
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

          {/* Media Upload Section */}
          <div className="space-y-2">
            {!mediaPreview && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp,video/mp4,video/quicktime,video/webm"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isSubmitting || isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting || isUploading}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Image or Video
                </Button>
              </>
            )}

            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative rounded-lg border border-gray-200 overflow-hidden">
                {isVideo ? (
                  <video
                    src={mediaPreview}
                    className="w-full h-48 object-cover"
                    controls
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={removeMedia}
                  disabled={isSubmitting || isUploading}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                  {isVideo ? (
                    <div className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      Video
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Image
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting || isUploading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading || !replyText.trim()}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : isSubmitting ? 'Posting...' : 'Post Reply'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
