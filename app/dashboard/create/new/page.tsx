'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PostingService, PostData } from '@/lib/posting/service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { AISuggestionsModal } from '@/components/dashboard/ai-suggestions-modal'
import { 
  Calendar,
  Clock,
  Image as ImageIcon,
  Send,
  Save,
  Sparkles,
  X,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

const platforms = [
  { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', charLimit: 280 },
  { id: 'instagram', name: 'Instagram', icon: '📷', charLimit: 2200 },
  { id: 'facebook', name: 'Facebook', icon: 'f', charLimit: 63206 },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', charLimit: 3000 },
  { id: 'youtube', name: 'YouTube', icon: '▶', charLimit: 5000 },
  { id: 'tiktok', name: 'TikTok', icon: '♪', charLimit: 2200 },
  { id: 'threads', name: 'Threads', icon: '@', charLimit: 500 },
  { id: 'bluesky', name: 'Bluesky', icon: '🦋', charLimit: 300 },
  { id: 'pinterest', name: 'Pinterest', icon: 'P', charLimit: 500 },
]

export default function CreateNewPostPage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [postContent, setPostContent] = useState('')
  const [platformContent, setPlatformContent] = useState<Record<string, string>>({})
  const [showPlatformCustomization, setShowPlatformCustomization] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadedMediaUrls, setUploadedMediaUrls] = useState<string[]>([])

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const handleContentChange = (content: string) => {
    setPostContent(content)
    
    // Update all platform content unless customized
    const updatedContent: Record<string, string> = {}
    selectedPlatforms.forEach(platformId => {
      if (!platformContent[platformId]) {
        updatedContent[platformId] = content
      }
    })
    setPlatformContent(prev => ({ ...prev, ...updatedContent }))
  }

  const handlePlatformContentChange = (platformId: string, content: string) => {
    setPlatformContent(prev => ({ ...prev, [platformId]: content }))
  }

  const handleAISuggestionSelect = (suggestion: string) => {
    setPostContent(suggestion)
    // Update all platform content unless customized
    const updatedContent: Record<string, string> = {}
    selectedPlatforms.forEach(platformId => {
      if (!platformContent[platformId]) {
        updatedContent[platformId] = suggestion
      }
    })
    setPlatformContent(prev => ({ ...prev, ...updatedContent }))
  }

  const getCharCount = (platformId: string) => {
    const content = platformContent[platformId] || postContent
    const platform = platforms.find(p => p.id === platformId)
    // Strip HTML tags for character count
    const textContent = content.replace(/<[^>]*>/g, '')
    return {
      current: textContent.length,
      limit: platform?.charLimit || 0
    }
  }

  const uploadFiles = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) return []
    
    const formData = new FormData()
    selectedFiles.forEach(file => {
      formData.append('files', file)
    })
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      
      const data = await response.json()
      return data.files.map((file: any) => file.url)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload images')
      return []
    }
  }

  const handlePostNow = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform')
      return
    }

    // Check if we have content either in main area or platform-specific
    const hasMainContent = postContent.trim().length > 0
    const hasPlatformContent = selectedPlatforms.some(platform => 
      platformContent[platform]?.trim().length > 0
    )
    
    if (!hasMainContent && !hasPlatformContent) {
      toast.error('Please enter some content')
      return
    }

    // Filter to only supported platforms for now
    const supportedPlatforms = selectedPlatforms.filter(p => ['facebook', 'bluesky'].includes(p))
    const unsupportedPlatforms = selectedPlatforms.filter(p => !['facebook', 'bluesky'].includes(p))

    if (supportedPlatforms.length === 0) {
      toast.error('Please select Facebook or Bluesky (other platforms coming soon!)')
      return
    }

    if (unsupportedPlatforms.length > 0) {
      toast.info(`Posting to ${supportedPlatforms.join(', ')} (${unsupportedPlatforms.join(', ')} coming soon!)`)
    }

    setIsPosting(true)

    // Safety timeout to prevent button getting stuck
    const timeoutId = setTimeout(() => {
      console.warn('Posting timeout - resetting button state')
      setIsPosting(false)
      toast.error('Posting timed out - please try again')
    }, 60000) // 60 second timeout for uploads

    try {
      // Upload files first if any
      let mediaUrls: string[] = []
      if (selectedFiles.length > 0) {
        toast.info('Uploading media...')
        mediaUrls = await uploadFiles()
        if (mediaUrls.length === 0 && selectedFiles.length > 0) {
          toast.error('Failed to upload media files')
          return
        }
        setUploadedMediaUrls(mediaUrls)
      }

      const postingService = new PostingService()
      const postData: PostData = {
        content: postContent,
        platforms: supportedPlatforms,
        platformContent: platformContent,
        mediaUrls: mediaUrls,
      }

      const results = await postingService.postToMultiplePlatforms(postData)
      
      // Show results
      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      if (successful.length > 0) {
        toast.success(`Successfully posted to ${successful.map(r => r.platform).join(', ')}!`)
      }

      if (failed.length > 0) {
        failed.forEach(result => {
          toast.error(`Failed to post to ${result.platform}: ${result.error}`)
        })
      }

      // Clear form if all successful
      if (failed.length === 0) {
        // Clean up uploaded images from storage
        if (mediaUrls.length > 0) {
          try {
            await fetch('/api/upload/cleanup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ urls: mediaUrls }),
            })
          } catch (error) {
            console.error('Failed to cleanup uploaded files:', error)
          }
        }
        
        setPostContent('')
        setPlatformContent({})
        setSelectedPlatforms([])
        setSelectedFiles([])
        setUploadedMediaUrls([])
      }

    } catch (error) {
      console.error('Posting error:', error)
      toast.error('Failed to post: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      // Clear timeout and always reset posting state
      clearTimeout(timeoutId)
      setIsPosting(false)
    }
  }

  const handleSchedulePost = async () => {
    if (!scheduledDate || !scheduledTime) {
      toast.error('Please select both date and time')
      return
    }

    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform')
      return
    }

    // Check if we have content either in main area or platform-specific
    const hasMainContent = postContent.trim().length > 0
    const hasPlatformContent = selectedPlatforms.some(platform => 
      platformContent[platform]?.trim().length > 0
    )
    
    if (!hasMainContent && !hasPlatformContent) {
      toast.error('Please enter some content')
      return
    }

    setIsPosting(true)

    try {
      // Upload files first if any
      let mediaUrls: string[] = []
      if (selectedFiles.length > 0) {
        toast.info('Uploading media...')
        mediaUrls = await uploadFiles()
        if (mediaUrls.length === 0 && selectedFiles.length > 0) {
          toast.error('Failed to upload media files')
          return
        }
      }

      // Combine date and time
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`)
      
      // Save to database
      const response = await fetch('/api/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: postContent,
          platforms: selectedPlatforms,
          platformContent: platformContent,
          mediaUrls: mediaUrls,
          scheduledFor: scheduledFor.toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to schedule post')
      }

      toast.success('Post scheduled successfully!')
      
      // Clear form
      setPostContent('')
      setPlatformContent({})
      setSelectedPlatforms([])
      setSelectedFiles([])
      setUploadedMediaUrls([])
      setScheduledDate('')
      setScheduledTime('')

    } catch (error) {
      console.error('Scheduling error:', error)
      toast.error('Failed to schedule post')
    } finally {
      setIsPosting(false)
    }
  }

  const handleSaveAsDraft = async () => {
    toast.info('Save as draft functionality coming soon!')
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const sizeLimit = isImage ? 50 * 1024 * 1024 : 500 * 1024 * 1024 // 50MB for images, 500MB for videos
      
      if (!isImage && !isVideo) {
        toast.error(`${file.name}: Only images and videos are supported`)
        return false
      }
      
      if (file.size > sizeLimit) {
        toast.error(`${file.name}: File too large (max ${isImage ? '50MB' : '500MB'})`)
        return false
      }
      
      return true
    })
    
    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Post</h1>
        <p className="text-gray-600 mt-1">Share your content across multiple social media platforms</p>
      </div>

      {/* Platform Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Platforms</CardTitle>
          <CardDescription>Choose where you want to publish your post</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all",
                  selectedPlatforms.includes(platform.id)
                    ? "border-primary bg-primary/10"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <span className="text-2xl mb-1">{platform.icon}</span>
                <span className="text-xs text-center">{platform.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Post Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Post Content</CardTitle>
              <CardDescription>Write your message</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAISuggestions(true)}
              disabled={selectedPlatforms.length === 0}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI Suggestions
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <RichTextEditor
              content={postContent}
              onChange={handleContentChange}
              placeholder="What's on your mind?"
              maxLength={selectedPlatforms.length === 1 ? platforms.find(p => p.id === selectedPlatforms[0])?.charLimit : 2200}
            />
            {selectedPlatforms.length === 1 && (
              <div className="mt-2 text-sm text-gray-500">
                {(() => {
                  const chars = getCharCount(selectedPlatforms[0])
                  return `${chars.current} / ${chars.limit} characters`
                })()}
              </div>
            )}
          </div>

          {/* Platform Customization Toggle */}
          {selectedPlatforms.length > 1 && (
            <button
              onClick={() => setShowPlatformCustomization(!showPlatformCustomization)}
              className="flex items-center text-sm text-primary hover:underline"
            >
              Customize per platform
              <ChevronDown className={cn(
                "ml-1 h-4 w-4 transition-transform",
                showPlatformCustomization ? "rotate-180" : ""
              )} />
            </button>
          )}

          {/* Platform-specific content */}
          {showPlatformCustomization && selectedPlatforms.length > 1 && (
            <div className="space-y-4 pt-4 border-t">
              {selectedPlatforms.map(platformId => {
                const platform = platforms.find(p => p.id === platformId)
                const chars = getCharCount(platformId)
                
                return (
                  <div key={platformId}>
                    <Label className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{platform?.icon}</span>
                      {platform?.name}
                    </Label>
                    <RichTextEditor
                      content={platformContent[platformId] || postContent}
                      onChange={(content) => handlePlatformContentChange(platformId, content)}
                      placeholder={`Customize for ${platform?.name}...`}
                      maxLength={platform?.charLimit}
                      className="min-h-[150px]"
                    />
                    <div className={cn(
                      "mt-1 text-sm",
                      chars.current > chars.limit ? "text-red-500" : "text-gray-500"
                    )}>
                      {chars.current} / {chars.limit} characters
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Media Upload */}
          <div>
            <Label>Media</Label>
            <div 
              className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-upload')?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => e.preventDefault()}
            >
              <input
                id="file-upload"
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                Images: PNG, JPG, GIF up to 50MB
              </p>
              <p className="text-xs text-gray-500">
                Videos: MP4, MOV, AVI up to 500MB
              </p>
            </div>
            
            {/* Selected Files Display */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium">Selected Files ({selectedFiles.length})</Label>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        {file.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                              <p className="text-xs text-gray-500 mt-1">Video</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <p className="text-xs text-gray-600 mt-1 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Post</CardTitle>
          <CardDescription>Choose when to publish your post</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <div className="relative">
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        {scheduledDate && scheduledTime ? (
          <>
            <Button 
              className="flex-1" 
              disabled={
                selectedPlatforms.length === 0 || 
                isPosting || 
                (!postContent.trim() && !selectedPlatforms.some(p => platformContent[p]?.trim()))
              }
              onClick={handleSchedulePost}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {isPosting ? 'Scheduling...' : 'Schedule Post'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setScheduledDate('')
                setScheduledTime('')
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Clear Schedule
            </Button>
          </>
        ) : (
          <Button 
            className="flex-1" 
            disabled={
              selectedPlatforms.length === 0 || 
              isPosting || 
              (!postContent.trim() && !selectedPlatforms.some(p => platformContent[p]?.trim()))
            }
            onClick={handlePostNow}
          >
            <Send className="mr-2 h-4 w-4" />
            {isPosting ? 'Posting...' : 'Post Now'}
          </Button>
        )}
        <Button 
          variant="outline" 
          className="flex-1" 
          disabled={selectedPlatforms.length === 0 || isPosting}
          onClick={handleSaveAsDraft}
        >
          <Save className="mr-2 h-4 w-4" />
          Save as Draft
        </Button>
      </div>

      {/* AI Suggestions Modal */}
      <AISuggestionsModal
        open={showAISuggestions}
        onOpenChange={setShowAISuggestions}
        content={postContent}
        platforms={selectedPlatforms}
        onSelectSuggestion={handleAISuggestionSelect}
      />
    </div>
  )
}
