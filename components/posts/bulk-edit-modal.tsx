'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Calendar, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface BulkPost {
  id: string
  content: string
  platforms: string[]
  scheduledDateTime?: string
  mediaFiles?: File[]
  status: 'draft' | 'scheduled' | 'error'
  error?: string
  charCount: number
}

interface BulkEditModalProps {
  post: BulkPost | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updatedPost: BulkPost) => void
  availablePlatforms: Array<{ id: string; name: string; charLimit: number }>
}

export function BulkEditModal({ 
  post, 
  open, 
  onOpenChange,
  onSave,
  availablePlatforms
}: BulkEditModalProps) {
  const [content, setContent] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [scheduledDateTime, setScheduledDateTime] = useState('')
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    if (post) {
      setContent(post.content)
      setSelectedPlatforms(post.platforms)
      setScheduledDateTime(post.scheduledDateTime || '')
      setCharCount(post.content.length)
    }
  }, [post])

  const handleContentChange = (value: string) => {
    setContent(value)
    setCharCount(value.length)
  }

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  const handleSave = () => {
    if (!post) return
    
    const updatedPost: BulkPost = {
      ...post,
      content,
      platforms: selectedPlatforms,
      scheduledDateTime,
      charCount,
      status: scheduledDateTime ? 'scheduled' : 'draft'
    }
    
    onSave(updatedPost)
    onOpenChange(false)
  }

  const getCharLimitWarnings = () => {
    return selectedPlatforms
      .map(platformId => {
        const platform = availablePlatforms.find(p => p.id === platformId)
        if (platform && charCount > platform.charLimit) {
          return `${platform.name} (${charCount}/${platform.charLimit})`
        }
        return null
      })
      .filter(Boolean)
  }

  const warnings = getCharLimitWarnings()

  if (!post) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bulk Post</DialogTitle>
          <DialogDescription>
            Edit the content and settings for this post
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Content */}
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              rows={6}
              className="mt-2"
              placeholder="What's on your mind?"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-muted-foreground">
                {charCount} characters
              </span>
              {warnings.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Exceeds limit for: {warnings.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Platforms */}
          <div>
            <Label>Platforms</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {availablePlatforms.map(platform => (
                <div key={platform.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={platform.id}
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={() => handlePlatformToggle(platform.id)}
                  />
                  <Label
                    htmlFor={platform.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {platform.name}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({platform.charLimit})
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Time */}
          <div>
            <Label htmlFor="schedule">
              <Calendar className="inline h-4 w-4 mr-1" />
              Schedule Time (Optional)
            </Label>
            <Input
              id="schedule"
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              className="mt-2"
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
          </div>

          {/* Status */}
          {post.status && (
            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Badge variant={
                post.status === 'error' ? 'destructive' : 
                post.status === 'scheduled' ? 'default' : 
                'secondary'
              }>
                {post.status}
              </Badge>
              {post.error && (
                <span className="text-sm text-destructive">{post.error}</span>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!content || selectedPlatforms.length === 0}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}