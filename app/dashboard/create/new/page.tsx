'use client'

import { useState } from 'react'
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
              onDrop={(e) => {
                e.preventDefault()
                // Handle file drop logic here
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => e.preventDefault()}
            >
              <input
                id="file-upload"
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  // Handle file selection logic here
                  const files = Array.from(e.target.files || [])
                  console.log('Selected files:', files)
                }}
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
        <Button className="flex-1" disabled={selectedPlatforms.length === 0}>
          <Send className="mr-2 h-4 w-4" />
          Post Now
        </Button>
        <Button variant="outline" className="flex-1" disabled={selectedPlatforms.length === 0}>
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
