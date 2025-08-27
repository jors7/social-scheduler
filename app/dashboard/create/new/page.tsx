'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { PostingService, PostData } from '@/lib/posting/service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { AISuggestionsModal } from '@/components/dashboard/ai-suggestions-modal'
import { SubscriptionGateNoSuspense as SubscriptionGate } from '@/components/subscription/subscription-gate-no-suspense'
import { createBrowserClient } from '@supabase/ssr'

// Dynamically import platform-specific components to avoid hydration issues
const PinterestBoardSelector = dynamic(() => import('@/components/pinterest/board-selector').then(mod => ({ default: mod.PinterestBoardSelector })), { ssr: false })
const VideoMetadata = dynamic(() => import('@/components/youtube/video-metadata'), { ssr: false })
const VideoUpload = dynamic(() => import('@/components/youtube/video-upload'), { ssr: false })
const TikTokVideoSettings = dynamic(() => import('@/components/tiktok/video-settings').then(mod => ({ default: mod.TikTokVideoSettings })), { ssr: false })
import { 
  Calendar,
  Clock,
  Image as ImageIcon,
  Send,
  Save,
  Sparkles,
  X,
  ChevronDown,
  Zap,
  Brain,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearchParams, useRouter } from 'next/navigation'

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

function CreateNewPostPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
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
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const loadedDraftRef = useRef<string | null>(null)
  const [shouldAutoPublish, setShouldAutoPublish] = useState(false)
  const [shouldAutoSchedule, setShouldAutoSchedule] = useState(false)
  const [editingScheduledPost, setEditingScheduledPost] = useState(false)
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false)
  const [pinterestBoards, setPinterestBoards] = useState<any[]>([])
  const [selectedPinterestBoard, setSelectedPinterestBoard] = useState<string>('')
  const [pinterestTitle, setPinterestTitle] = useState<string>('')
  const [pinterestDescription, setPinterestDescription] = useState<string>('')
  const [pinterestLink, setPinterestLink] = useState<string>('')
  // YouTube states
  const [youtubeTitle, setYoutubeTitle] = useState<string>('')
  const [youtubeDescription, setYoutubeDescription] = useState<string>('')
  const [youtubeTags, setYoutubeTags] = useState<string[]>([])
  const [youtubeCategoryId, setYoutubeCategoryId] = useState<string>('22') // Default to People & Blogs
  const [youtubePrivacyStatus, setYoutubePrivacyStatus] = useState<'private' | 'unlisted' | 'public'>('private')
  const [youtubeVideoFile, setYoutubeVideoFile] = useState<File | null>(null)
  const [youtubeThumbnailFile, setYoutubeThumbnailFile] = useState<File | null>(null)
  
  // Debug YouTube state changes
  useEffect(() => {
    console.log('YouTube state updated:', {
      videoFile: youtubeVideoFile,
      title: youtubeTitle,
      hasVideo: !!youtubeVideoFile,
      hasTitle: !!(youtubeTitle && youtubeTitle.trim())
    })
  }, [youtubeVideoFile, youtubeTitle])
  
  // TikTok states
  const [tiktokPrivacyLevel, setTiktokPrivacyLevel] = useState<'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'>('PUBLIC_TO_EVERYONE')
  const [tiktokSaveAsDraft, setTiktokSaveAsDraft] = useState(false)

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const handleContentChange = (content: string) => {
    setPostContent(content)
    // Don't automatically sync to platform content - let users explicitly customize if needed
  }

  const handlePlatformContentChange = (platformId: string, content: string) => {
    setPlatformContent(prev => ({ ...prev, [platformId]: content }))
  }

  const handleAISuggestionSelect = (suggestion: string) => {
    setPostContent(suggestion)
    // Don't automatically sync to platform content - let users explicitly customize if needed
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
    
    // Check if we have video files
    const hasVideos = selectedFiles.some(file => file.type.startsWith('video/'))
    
    // For videos or mixed media, use direct upload to avoid Vercel size limits
    if (hasVideos) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to upload files')
        return []
      }
      
      const uploadedUrls: string[] = []
      toast.info(`Uploading ${selectedFiles.length} file(s)...`)
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        try {
          // Generate unique filename
          const timestamp = Date.now()
          const randomString = Math.random().toString(36).substring(2, 8)
          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}/${timestamp}-${randomString}.${fileExt}`
          
          // Upload directly to Supabase Storage
          const { data, error } = await supabase.storage
            .from('post-media')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            })
          
          if (error) throw error
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('post-media')
            .getPublicUrl(fileName)
          
          uploadedUrls.push(publicUrl)
          toast.success(`Uploaded ${i + 1} of ${selectedFiles.length}`)
        } catch (error) {
          console.error('Upload error for file:', file.name, error)
          toast.error(`Failed to upload ${file.name}`)
        }
      }
      
      return uploadedUrls
    } else {
      // For images only, use the API route (smaller files)
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
  }

  const handlePostNow = useCallback(async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform')
      return
    }

    // Check if we have content either in main area or platform-specific
    const hasMainContent = postContent.trim().length > 0
    const hasPlatformContent = selectedPlatforms.some(platform => 
      platformContent[platform]?.trim().length > 0
    )
    
    // Special handling for YouTube - video is the content
    const hasYouTubeContent = selectedPlatforms.includes('youtube') && 
      youtubeVideoFile !== null && 
      youtubeTitle && youtubeTitle.trim().length > 0
    
    // Debug logging for YouTube validation
    if (selectedPlatforms.includes('youtube')) {
      console.log('YouTube validation:', {
        hasVideo: youtubeVideoFile !== null,
        title: youtubeTitle,
        titleLength: youtubeTitle ? youtubeTitle.trim().length : 0,
        hasYouTubeContent
      })
    }
    
    // Special handling for Pinterest - can work with just image + board
    const hasPinterestContent = selectedPlatforms.includes('pinterest') && 
      selectedPinterestBoard && 
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)
    
    // Check if we have video files for TikTok
    const hasVideoFiles = selectedFiles.some(file => file.type.startsWith('video/')) || 
                          uploadedMediaUrls.some(url => url.includes('.mp4') || url.includes('.mov') || url.includes('.avi'))
    
    // Special handling for TikTok - requires video
    const hasTikTokContent = selectedPlatforms.includes('tiktok') && hasVideoFiles
    
    // Check content requirements - special handling for platform-specific content
    const isYouTubeOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'youtube'
    const isPinterestOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'pinterest'
    const isTikTokOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'tiktok'
    
    // For YouTube-only posts, validate YouTube requirements immediately
    if (isYouTubeOnly) {
      if (!youtubeVideoFile) {
        console.log('YouTube-only: no video file detected')
        toast.error('YouTube requires a video file')
        return
      }
      if (!youtubeTitle || !youtubeTitle.trim()) {
        toast.error('YouTube requires a video title')
        return
      }
      // YouTube validation passed, skip other content checks
    } else if (isPinterestOnly && hasPinterestContent) {
      // Pinterest has its content (board + image)
    } else if (isTikTokOnly && hasTikTokContent) {
      // TikTok has its content (video)
    } else if (!hasMainContent && !hasPlatformContent && !hasYouTubeContent && !hasPinterestContent && !hasTikTokContent) {
      // For other platforms or mixed platforms, require some content
      toast.error('Please enter some content')
      return
    }
    
    // YouTube-specific validation (only for mixed platforms, not YouTube-only)
    if (!isYouTubeOnly && selectedPlatforms.includes('youtube')) {
      console.log('YouTube validation check:', {
        videoFile: youtubeVideoFile,
        title: youtubeTitle,
        hasVideo: !!youtubeVideoFile,
        hasTitle: !!(youtubeTitle && youtubeTitle.trim())
      })
      
      if (!youtubeVideoFile) {
        toast.error('YouTube requires a video file')
        return
      }
      if (!youtubeTitle || !youtubeTitle.trim()) {
        toast.error('YouTube requires a video title')
        return
      }
    }
    
    // TikTok-specific validation
    if (selectedPlatforms.includes('tiktok')) {
      if (!hasVideoFiles) {
        toast.error('TikTok requires a video file')
        return
      }
    }

    // Filter to only supported platforms for now
    const supportedPlatforms = selectedPlatforms.filter(p => ['facebook', 'bluesky', 'pinterest', 'tiktok', 'youtube', 'linkedin'].includes(p))
    const unsupportedPlatforms = selectedPlatforms.filter(p => !['facebook', 'bluesky', 'pinterest', 'tiktok', 'youtube', 'linkedin'].includes(p))

    if (supportedPlatforms.length === 0) {
      toast.error('Please select Facebook, Bluesky, Pinterest, TikTok, YouTube, or LinkedIn (other platforms coming soon!)')
      return
    }

    // Check Pinterest requirements
    if (supportedPlatforms.includes('pinterest')) {
      if (!selectedPinterestBoard) {
        toast.error('Please select a Pinterest board')
        return
      }
      if (!selectedFiles.length && !uploadedMediaUrls.length) {
        toast.error('Pinterest requires at least one image')
        return
      }
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
      
      // Only include platform-specific content if it's actually different from main content
      const filteredPlatformContent: Record<string, string> = {}
      Object.entries(platformContent).forEach(([platform, content]) => {
        // Only include if it's different from main content and not empty
        if (content && content.trim() !== postContent.trim()) {
          filteredPlatformContent[platform] = content
        }
      })
      
      // Handle YouTube separately if selected
      let youtubeVideoUrl: string | undefined;
      if (selectedPlatforms.includes('youtube') && youtubeVideoFile) {
        // Upload YouTube video first
        toast.info('Uploading video to YouTube...')
        
        const formData = new FormData()
        formData.append('video', youtubeVideoFile)
        if (youtubeThumbnailFile) {
          formData.append('thumbnail', youtubeThumbnailFile)
        }
        formData.append('title', youtubeTitle || 'New Video')
        formData.append('description', youtubeDescription || postContent)
        formData.append('tags', youtubeTags.join(','))
        formData.append('categoryId', youtubeCategoryId)
        formData.append('privacyStatus', youtubePrivacyStatus)

        try {
          const response = await fetch('/api/media/upload/youtube', {
            method: 'POST',
            body: formData,
          })
          
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'YouTube upload failed')
          }
          
          const result = await response.json()
          youtubeVideoUrl = result.video.url
          toast.success('Video uploaded to YouTube successfully!')
          
          // Remove YouTube from platforms to post (since it's already posted)
          const platformsWithoutYouTube = supportedPlatforms.filter(p => p !== 'youtube')
          
          // If YouTube was the only platform, we're done
          if (platformsWithoutYouTube.length === 0) {
            toast.success(`Video posted to YouTube: ${youtubeVideoUrl}`)
            // Clear form
            setPostContent('')
            setPlatformContent({})
            setSelectedPlatforms([])
            setSelectedFiles([])
            setUploadedMediaUrls([])
            setYoutubeVideoFile(null)
            setYoutubeThumbnailFile(null)
            setYoutubeTitle('')
            setYoutubeDescription('')
            setYoutubeTags([])
            clearTimeout(timeoutId)
            setIsPosting(false)
            return
          }
          
          // Continue with other platforms
          supportedPlatforms.splice(supportedPlatforms.indexOf('youtube'), 1)
        } catch (error) {
          console.error('YouTube upload error:', error)
          toast.error(`YouTube upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          clearTimeout(timeoutId)
          setIsPosting(false)
          return
        }
      }

      const postData: PostData = {
        content: postContent,
        platforms: supportedPlatforms,
        platformContent: Object.keys(filteredPlatformContent).length > 0 ? filteredPlatformContent : undefined,
        mediaUrls: mediaUrls,
        pinterestBoardId: selectedPinterestBoard,
        pinterestTitle: pinterestTitle || undefined,
        pinterestDescription: pinterestDescription || undefined,
        pinterestLink: pinterestLink || undefined,
        tiktokPrivacyLevel: selectedPlatforms.includes('tiktok') ? (tiktokSaveAsDraft ? 'SELF_ONLY' : tiktokPrivacyLevel) : undefined,
      }

      const results = await postingService.postToMultiplePlatforms(postData)
      
      // Show results
      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      if (successful.length > 0) {
        toast.success(`Successfully posted to ${successful.map(r => r.platform).join(', ')}!`)
        
        // Check if TikTok was posted and show status check info
        const tiktokResult = results.find(r => r.platform === 'tiktok' || r.platform.startsWith('tiktok'))
        if (tiktokResult?.success && tiktokResult.postId) {
          toast.info(
            '📱 TikTok Sandbox Mode: Your video is being processed (2-5 minutes). ' +
            'Look for it in: TikTok App → Profile → Drafts folder. ' +
            'If not there, check Profile → Private videos (lock icon).', 
            {
              duration: 15000 // Show for 15 seconds
            }
          )
          
          // Store the publishId for potential status checking
          console.log('TikTok publish ID:', tiktokResult.postId)
          console.log('IMPORTANT: Video will appear in DRAFTS folder in TikTok app after processing')
          
          // Optional: Start polling for status
          // checkTikTokStatus(tiktokResult.postId)
        }
      }

      if (failed.length > 0) {
        failed.forEach(result => {
          toast.error(`Failed to post to ${result.platform}: ${result.error}`)
        })
      }

      // Clear form if all successful
      if (failed.length === 0) {
        // Clean up uploaded images from storage
        // IMPORTANT: Don't cleanup if TikTok was posted - TikTok needs time to download the video
        const postedToTikTok = successful.some(r => r.platform === 'tiktok' || r.platform.startsWith('tiktok'))
        
        if (mediaUrls.length > 0 && !postedToTikTok) {
          try {
            await fetch('/api/upload/cleanup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ urls: mediaUrls }),
            })
          } catch (error) {
            console.error('Failed to cleanup uploaded files:', error)
          }
        } else if (postedToTikTok) {
          console.log('Skipping media cleanup - TikTok needs time to download the video')
          toast.warning('Video will remain in storage for TikTok to process. You can delete it manually later from Supabase.', {
            duration: 8000
          })
        }
        
        // Delete draft if this was posted from a draft
        if (currentDraftId) {
          try {
            await fetch(`/api/drafts?id=${currentDraftId}`, {
              method: 'DELETE'
            })
            console.log('Draft deleted after successful posting')
          } catch (error) {
            console.error('Failed to delete draft after posting:', error)
          }
        }
        
        setPostContent('')
        setPlatformContent({})
        setSelectedPlatforms([])
        setSelectedFiles([])
        setUploadedMediaUrls([])
        setCurrentDraftId(null)
      }

    } catch (error) {
      console.error('Posting error:', error)
      toast.error('Failed to post: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      // Clear timeout and always reset posting state
      clearTimeout(timeoutId)
      setIsPosting(false)
    }
  }, [selectedPlatforms, postContent, platformContent, selectedFiles, uploadedMediaUrls, currentDraftId, 
      youtubeVideoFile, youtubeTitle, youtubeDescription, youtubeTags, youtubeCategoryId, youtubePrivacyStatus, youtubeThumbnailFile,
      selectedPinterestBoard, pinterestTitle, pinterestDescription, pinterestLink,
      tiktokPrivacyLevel, tiktokSaveAsDraft])

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
    
    // Special handling for YouTube - video is the content
    const hasYouTubeContent = selectedPlatforms.includes('youtube') && 
      youtubeVideoFile !== null && 
      youtubeTitle && youtubeTitle.trim().length > 0
    
    // Debug logging for YouTube validation
    if (selectedPlatforms.includes('youtube')) {
      console.log('YouTube validation:', {
        hasVideo: youtubeVideoFile !== null,
        title: youtubeTitle,
        titleLength: youtubeTitle ? youtubeTitle.trim().length : 0,
        hasYouTubeContent
      })
    }
    
    // Special handling for Pinterest - can work with just image + board
    const hasPinterestContent = selectedPlatforms.includes('pinterest') && 
      selectedPinterestBoard && 
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)
    
    // Check if we have video files for TikTok
    const hasVideoFiles = selectedFiles.some(file => file.type.startsWith('video/')) || 
                          uploadedMediaUrls.some(url => url.includes('.mp4') || url.includes('.mov') || url.includes('.avi'))
    
    // Special handling for TikTok - requires video
    const hasTikTokContent = selectedPlatforms.includes('tiktok') && hasVideoFiles
    
    // Check content requirements - special handling for platform-specific content
    const isYouTubeOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'youtube'
    const isPinterestOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'pinterest'
    const isTikTokOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'tiktok'
    
    // For YouTube-only posts, validate YouTube requirements immediately
    if (isYouTubeOnly) {
      if (!youtubeVideoFile) {
        console.log('YouTube-only: no video file detected')
        toast.error('YouTube requires a video file')
        return
      }
      if (!youtubeTitle || !youtubeTitle.trim()) {
        toast.error('YouTube requires a video title')
        return
      }
      // YouTube validation passed, skip other content checks
    } else if (isPinterestOnly && hasPinterestContent) {
      // Pinterest has its content (board + image)
    } else if (isTikTokOnly && hasTikTokContent) {
      // TikTok has its content (video)
    } else if (!hasMainContent && !hasPlatformContent && !hasYouTubeContent && !hasPinterestContent && !hasTikTokContent) {
      // For other platforms or mixed platforms, require some content
      toast.error('Please enter some content')
      return
    }
    
    // YouTube-specific validation (only for mixed platforms, not YouTube-only)
    if (!isYouTubeOnly && selectedPlatforms.includes('youtube')) {
      console.log('YouTube validation check:', {
        videoFile: youtubeVideoFile,
        title: youtubeTitle,
        hasVideo: !!youtubeVideoFile,
        hasTitle: !!(youtubeTitle && youtubeTitle.trim())
      })
      
      if (!youtubeVideoFile) {
        toast.error('YouTube requires a video file')
        return
      }
      if (!youtubeTitle || !youtubeTitle.trim()) {
        toast.error('YouTube requires a video title')
        return
      }
    }
    
    // TikTok-specific validation
    if (selectedPlatforms.includes('tiktok')) {
      if (!hasVideoFiles) {
        toast.error('TikTok requires a video file')
        return
      }
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
      
      // Only include platform-specific content if it's actually different from main content
      const filteredPlatformContent: Record<string, string> = {}
      Object.entries(platformContent).forEach(([platform, content]) => {
        // Only include if it's different from main content and not empty
        if (content && content.trim() !== postContent.trim()) {
          filteredPlatformContent[platform] = content
        }
      })
      
      const requestData = {
        content: postContent,
        platforms: selectedPlatforms,
        platformContent: Object.keys(filteredPlatformContent).length > 0 ? filteredPlatformContent : undefined,
        mediaUrls: mediaUrls,
        scheduledFor: scheduledFor.toISOString(),
        pinterestBoardId: selectedPinterestBoard || undefined,
        pinterestTitle: pinterestTitle || undefined,
        pinterestDescription: pinterestDescription || undefined,
        pinterestLink: pinterestLink || undefined,
      }
      
      console.log('Sending schedule request:', requestData)
      
      // Update existing scheduled post or create new one
      let response
      if (editingScheduledPost && currentDraftId) {
        // Update existing scheduled post
        response = await fetch('/api/posts/schedule', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: currentDraftId,
            content: requestData.content,
            platforms: requestData.platforms,
            platformContent: requestData.platformContent,
            mediaUrls: requestData.mediaUrls,
            scheduledFor: requestData.scheduledFor,
            pinterestBoardId: requestData.pinterestBoardId,
            pinterestTitle: requestData.pinterestTitle,
            pinterestDescription: requestData.pinterestDescription,
            pinterestLink: requestData.pinterestLink
          }),
        })
      } else {
        // Create new scheduled post
        response = await fetch('/api/posts/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Schedule API error:', errorData)
        throw new Error(errorData.error || 'Failed to schedule post')
      }

      const successMessage = editingScheduledPost ? 'Scheduled post updated successfully!' : 'Post scheduled successfully!'
      toast.success(successMessage)
      
      // Delete draft if this was scheduled from a draft (not when editing scheduled post)
      if (!editingScheduledPost && currentDraftId) {
        try {
          await fetch(`/api/drafts?id=${currentDraftId}`, {
            method: 'DELETE'
          })
          console.log('Draft deleted after successful scheduling')
        } catch (error) {
          console.error('Failed to delete draft after scheduling:', error)
        }
      }
      
      // Clear form
      setPostContent('')
      setPlatformContent({})
      setSelectedPlatforms([])
      setSelectedFiles([])
      setUploadedMediaUrls([])
      setScheduledDate('')
      setScheduledTime('')
      setCurrentDraftId(null)
      setEditingScheduledPost(false)

    } catch (error) {
      console.error('Scheduling error:', error)
      toast.error('Failed to schedule post')
    } finally {
      setIsPosting(false)
    }
  }

  const handleSaveAsDraft = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform')
      return
    }

    // For drafts, allow YouTube-only posts without main content if they have video
    const isYouTubeOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'youtube'
    if (!postContent.trim() && !isYouTubeOnly) {
      toast.error('Please enter some content')
      return
    }
    if (isYouTubeOnly && !youtubeVideoFile) {
      toast.error('YouTube requires a video file')
      return
    }

    setIsPosting(true)

    try {
      // Upload files first if any
      let mediaUrls: string[] = [...uploadedMediaUrls] // Include existing URLs
      if (selectedFiles.length > 0) {
        toast.info('Uploading media...')
        const newUrls = await uploadFiles()
        mediaUrls = [...mediaUrls, ...newUrls]
      }

      // Only include platform-specific content if it's actually different from main content
      const filteredPlatformContent: Record<string, string> = {}
      Object.entries(platformContent).forEach(([platform, content]) => {
        if (content && content.trim() !== postContent.trim()) {
          filteredPlatformContent[platform] = content
        }
      })

      // Extract title from content (first line or first 50 chars)
      const plainText = postContent.replace(/<[^>]*>/g, '').trim()
      const title = plainText.split('\n')[0].slice(0, 50) + (plainText.length > 50 ? '...' : '')

      const method = currentDraftId ? 'PATCH' : 'POST'
      const body = {
        title: title || 'Untitled Draft',
        content: postContent,
        platforms: selectedPlatforms,
        platformContent: Object.keys(filteredPlatformContent).length > 0 ? filteredPlatformContent : undefined,
        mediaUrls: mediaUrls,
      }
      
      if (currentDraftId) {
        (body as any).draftId = currentDraftId
      }

      const response = await fetch('/api/drafts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Failed to save draft')
      }

      toast.success(currentDraftId ? 'Draft updated successfully!' : 'Draft saved successfully!')
      
      // Clear form
      setPostContent('')
      setPlatformContent({})
      setSelectedPlatforms([])
      setSelectedFiles([])
      setUploadedMediaUrls([])
      setCurrentDraftId(null)
      
      // Redirect to drafts page
      router.push('/dashboard/posts/drafts')

    } catch (error) {
      console.error('Save draft error:', error)
      toast.error('Failed to save draft')
    } finally {
      setIsPosting(false)
    }
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

  const handleSmartSchedule = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform first')
      return
    }

    setLoadingSuggestions(true)
    try {
      // For now, we'll create smart suggestions on the frontend
      // In the future, this could call the backend API
      const suggestions: any[] = []
      const now = new Date()
      
      // Generate next 3 optimal times for each platform
      for (const platform of selectedPlatforms) {
        // Simple smart scheduling logic
        const baseOptimalTimes = {
          facebook: [{ day: 2, hour: 15 }, { day: 3, hour: 10 }, { day: 4, hour: 12 }], // Tue 3PM, Wed 10AM, Thu 12PM
          bluesky: [{ day: 2, hour: 9 }, { day: 3, hour: 12 }, { day: 4, hour: 17 }], // Tue 9AM, Wed 12PM, Thu 5PM
          instagram: [{ day: 1, hour: 11 }, { day: 3, hour: 14 }, { day: 5, hour: 17 }], // Mon 11AM, Wed 2PM, Fri 5PM
          linkedin: [{ day: 2, hour: 8 }, { day: 3, hour: 12 }, { day: 4, hour: 17 }], // Tue 8AM, Wed 12PM, Thu 5PM
        }

        const platformTimes = baseOptimalTimes[platform as keyof typeof baseOptimalTimes] || [
          { day: 2, hour: 10 }, { day: 3, hour: 14 }, { day: 4, hour: 16 }
        ]

        platformTimes.forEach((time, index) => {
          const suggestionDate = new Date(now)
          const daysUntil = (time.day - now.getDay() + 7) % 7
          suggestionDate.setDate(now.getDate() + daysUntil)
          suggestionDate.setHours(time.hour, 0, 0, 0)

          // If the time has passed today, move to next week
          if (suggestionDate <= now) {
            suggestionDate.setDate(suggestionDate.getDate() + 7)
          }

          suggestions.push({
            datetime: suggestionDate,
            platform,
            confidence: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
            reason: `Optimal time for ${platform} based on general best practices`,
            score: 90 - (index * 10)
          })
        })
      }

      // Sort by datetime and take top 5
      suggestions.sort((a, b) => a.datetime.getTime() - b.datetime.getTime())
      setSmartSuggestions(suggestions.slice(0, 5))
      setShowSmartSuggestions(true)
      toast.success('Smart schedule suggestions generated!')
      
    } catch (error) {
      console.error('Smart scheduling error:', error)
      toast.error('Failed to generate smart suggestions')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const applySuggestion = (suggestion: any) => {
    const date = new Date(suggestion.datetime)
    setScheduledDate(date.toISOString().split('T')[0])
    setScheduledTime(date.toTimeString().slice(0, 5))
    setShowSmartSuggestions(false)
    toast.success(`Scheduled for ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
  }

  // Load draft or scheduled post if ID is present in URL
  useEffect(() => {
    const draftId = searchParams.get('draftId')
    const scheduledPostId = searchParams.get('scheduledPostId')
    const shouldSchedule = searchParams.get('schedule') === 'true'
    const shouldPublish = searchParams.get('publish') === 'true'
    
    if (draftId && draftId !== loadedDraftRef.current && !loadingDraft) {
      console.log('Starting draft load for:', draftId)
      loadedDraftRef.current = draftId
      setCurrentDraftId(draftId)
      loadDraft(draftId, shouldSchedule, shouldPublish)
    } else if (scheduledPostId && scheduledPostId !== loadedDraftRef.current && !loadingDraft) {
      console.log('Starting scheduled post load for:', scheduledPostId)
      loadedDraftRef.current = scheduledPostId
      loadScheduledPost(scheduledPostId)
    }
  }, [searchParams, loadingDraft])

  // Auto-publish when draft is loaded and platforms are set
  useEffect(() => {
    if (shouldAutoPublish && selectedPlatforms.length > 0 && postContent.trim() && !isPosting) {
      console.log('Auto-publishing with platforms:', selectedPlatforms)
      setShouldAutoPublish(false)
      handlePostNow()
    }
  }, [selectedPlatforms, postContent, shouldAutoPublish, isPosting, handlePostNow])

  // Auto-schedule when draft is loaded and platforms are set
  useEffect(() => {
    if (shouldAutoSchedule && selectedPlatforms.length > 0 && postContent.trim() && !isPosting) {
      console.log('Auto-scheduling with platforms:', selectedPlatforms)
      setShouldAutoSchedule(false)
      // The schedule form should already be pre-filled
    }
  }, [selectedPlatforms, postContent, shouldAutoSchedule, isPosting])

  const loadDraft = async (draftId: string, openSchedule: boolean, publishNow: boolean) => {
    setLoadingDraft(true)
    try {
      console.log('Loading draft with ID:', draftId)
      const response = await fetch('/api/drafts')
      if (!response.ok) throw new Error('Failed to fetch drafts')
      
      const data = await response.json()
      console.log('All drafts:', data.drafts)
      const draft = data.drafts?.find((d: any) => d.id === draftId)
      console.log('Found draft:', draft)
      
      if (!draft) {
        toast.error('Draft not found')
        return
      }
      
      // Debug: Log what we're setting
      console.log('Setting content:', draft.content)
      console.log('Setting platforms:', draft.platforms)
      console.log('Setting platform_content:', draft.platform_content)
      console.log('Setting media_urls:', draft.media_urls)
      
      // Load draft data into form
      setPostContent(draft.content || '')
      setSelectedPlatforms(draft.platforms || [])
      setPlatformContent(draft.platform_content || {})
      
      // If there are platform-specific content, show customization
      if (Object.keys(draft.platform_content || {}).length > 0) {
        setShowPlatformCustomization(true)
      }
      
      // Load media URLs if any
      if (draft.media_urls && draft.media_urls.length > 0) {
        setUploadedMediaUrls(draft.media_urls)
        // Note: We can&apos;t restore the actual File objects, just the URLs
        toast.info('Media files from draft have been loaded')
      }
      
      console.log('Draft data set successfully')
      
      // Handle schedule/publish actions
      if (openSchedule) {
        // Set a default schedule time (e.g., 1 hour from now)
        const now = new Date()
        now.setHours(now.getHours() + 1)
        const dateStr = now.toISOString().split('T')[0]
        const timeStr = now.toTimeString().slice(0, 5)
        setScheduledDate(dateStr)
        setScheduledTime(timeStr)
        setShouldAutoSchedule(true)
        toast.info('Draft loaded. Please select when to schedule the post.')
      } else if (publishNow) {
        // Set flag to auto-publish once platforms are loaded
        setShouldAutoPublish(true)
        toast.info('Draft loaded. Publishing now...')
      } else {
        toast.success('Draft loaded successfully')
      }
      
    } catch (error) {
      console.error('Error loading draft:', error)
      toast.error('Failed to load draft')
    } finally {
      setLoadingDraft(false)
    }
  }

  const loadScheduledPost = async (postId: string) => {
    setLoadingDraft(true) // Reuse the same loading state
    try {
      console.log('Loading scheduled post with ID:', postId)
      const response = await fetch('/api/posts/schedule')
      if (!response.ok) throw new Error('Failed to fetch scheduled posts')
      
      const data = await response.json()
      console.log('All scheduled posts:', data.posts)
      const scheduledPost = data.posts?.find((p: any) => p.id === postId)
      console.log('Found scheduled post:', scheduledPost)
      
      if (!scheduledPost) {
        toast.error('Scheduled post not found')
        return
      }
      
      // Load scheduled post data into form
      console.log('Setting content:', scheduledPost.content)
      console.log('Setting platforms:', scheduledPost.platforms)
      console.log('Setting platform_content:', scheduledPost.platform_content)
      console.log('Setting media_urls:', scheduledPost.media_urls)
      console.log('Setting scheduled time:', scheduledPost.scheduled_for)
      
      setPostContent(scheduledPost.content || '')
      setSelectedPlatforms(scheduledPost.platforms || [])
      setPlatformContent(scheduledPost.platform_content || {})
      
      // If there are platform-specific content, show customization
      if (Object.keys(scheduledPost.platform_content || {}).length > 0) {
        setShowPlatformCustomization(true)
      }
      
      // Load media URLs if any
      if (scheduledPost.media_urls && scheduledPost.media_urls.length > 0) {
        setUploadedMediaUrls(scheduledPost.media_urls)
        toast.info('Media files from scheduled post have been loaded')
      }
      
      // Pre-fill the scheduled date and time from the original schedule
      if (scheduledPost.scheduled_for) {
        const scheduledDate = new Date(scheduledPost.scheduled_for)
        const dateStr = scheduledDate.toISOString().split('T')[0]
        const timeStr = scheduledDate.toTimeString().slice(0, 5)
        setScheduledDate(dateStr)
        setScheduledTime(timeStr)
      }
      
      // Store the original post ID for updating
      setCurrentDraftId(postId) // Reuse the same state for tracking the post being edited
      setEditingScheduledPost(true) // Mark that we're editing a scheduled post
      
      console.log('Scheduled post data loaded successfully')
      toast.success('Scheduled post loaded for editing')
      
    } catch (error) {
      console.error('Error loading scheduled post:', error)
      toast.error('Failed to load scheduled post')
    } finally {
      setLoadingDraft(false)
    }
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header with gradient title */}
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white">
            <Send className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
          </div>
          <span className="break-words">Create New Post</span>
        </h1>
        <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
          Share your content across multiple platforms
        </p>
        {loadingDraft && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-700 text-sm font-medium">Loading draft...</span>
          </div>
        )}
      </div>

      <SubscriptionGate feature="post scheduling">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="col-span-1 lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">
          {/* Post Content */}
          <Card variant="elevated" className="hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Post Content</CardTitle>
                  <CardDescription className="text-sm sm:text-base text-gray-600">Write your message</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAISuggestions(true)}
                  disabled={selectedPlatforms.length === 0}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200 hover:border-purple-300 w-full sm:w-auto"
                >
                  <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
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
            </CardContent>
          </Card>

          {/* Media Upload */}
          <Card variant="elevated" className="hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Media</CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-600">Add images and videos to your post</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
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
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
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

              {/* Show existing media from draft */}
              {uploadedMediaUrls.length > 0 && selectedFiles.length === 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">Previously Uploaded Media</Label>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {uploadedMediaUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={url}
                            alt={`Media ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setUploadedMediaUrls(prev => prev.filter((_, i) => i !== index))
                            toast.info('Media removed from post')
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card variant="elevated" className="hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Schedule</CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-600">When to publish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Schedule Options</Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSmartSchedule}
                  disabled={loadingSuggestions || selectedPlatforms.length === 0}
                  className="text-xs"
                >
                  <Brain className="mr-1 h-3 w-3" />
                  {loadingSuggestions ? 'Analyzing...' : 'Smart Schedule'}
                </Button>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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

              {/* Smart Suggestions */}
              {showSmartSuggestions && smartSuggestions.length > 0 && (
                <Card variant="glass" className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-900 flex items-center gap-2">
                        <div className="p-1 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                          <Zap className="h-3 w-3 text-white" />
                        </div>
                        Smart Schedule Suggestions
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSmartSuggestions(false)}
                        className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {smartSuggestions.map((suggestion, index) => {
                      const date = new Date(suggestion.datetime)
                      const isSelected = scheduledDate === date.toISOString().split('T')[0] &&
                                       scheduledTime === date.toTimeString().slice(0, 5)
                      
                      return (
                        <button
                          key={index}
                          onClick={() => applySuggestion(suggestion)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-colors",
                            isSelected 
                              ? "border-blue-300 bg-blue-100" 
                              : "border-gray-200 hover:border-blue-200 hover:bg-white"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm text-gray-900">
                                {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {suggestion.reason}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{platforms.find(p => p.id === suggestion.platform)?.icon}</span>
                              <span className={cn(
                                "text-xs px-2 py-1 rounded",
                                suggestion.confidence === 'high' ? "bg-green-100 text-green-700" :
                                suggestion.confidence === 'medium' ? "bg-yellow-100 text-yellow-700" :
                                "bg-gray-100 text-gray-700"
                              )}>
                                {suggestion.confidence}
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                    </div>
                    <div className="mt-3 text-xs text-blue-700 bg-blue-100 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600">💡</span>
                        <div>These times are based on general best practices. As you post more, suggestions will improve based on your audience&apos;s engagement patterns.</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {scheduledDate && scheduledTime && (
                <div className="sm:col-span-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Scheduled for:</p>
                  <p className="text-sm text-blue-700">
                    {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card variant="elevated" className="hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Actions</CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-600">Publish or save your post</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {scheduledDate && scheduledTime ? (
                <>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg" 
                    disabled={
                      selectedPlatforms.length === 0 || 
                      isPosting || 
                      loadingDraft ||
                      (!postContent.trim() && !selectedPlatforms.some(p => platformContent[p]?.trim()) && 
                        !(selectedPlatforms.includes('youtube') && youtubeVideoFile && youtubeTitle.trim()) &&
                        !(selectedPlatforms.includes('pinterest') && selectedPinterestBoard && (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)) &&
                        !(selectedPlatforms.includes('tiktok') && (selectedFiles.some(f => f.type.startsWith('video/')) || uploadedMediaUrls.some(url => url.includes('.mp4') || url.includes('.mov') || url.includes('.avi')))))
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
                    className="hover:bg-red-50 hover:border-red-300"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Schedule
                  </Button>
                </>
              ) : (
                <Button 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg" 
                  disabled={
                    selectedPlatforms.length === 0 || 
                    isPosting || 
                    loadingDraft ||
                    (!postContent.trim() && !selectedPlatforms.some(p => platformContent[p]?.trim()) && 
                      !(selectedPlatforms.includes('youtube') && youtubeVideoFile && youtubeTitle.trim()) &&
                      !(selectedPlatforms.includes('pinterest') && selectedPinterestBoard && (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)) &&
                      !(selectedPlatforms.includes('tiktok') && (selectedFiles.some(f => f.type.startsWith('video/')) || uploadedMediaUrls.some(url => url.includes('.mp4') || url.includes('.mov') || url.includes('.avi')))))
                  }
                  onClick={handlePostNow}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isPosting ? 'Posting...' : 'Post Now'}
                </Button>
              )}
              <Button 
                variant="outline" 
                className="flex-1 hover:bg-orange-50 hover:border-orange-300" 
                disabled={selectedPlatforms.length === 0 || isPosting || loadingDraft}
                onClick={handleSaveAsDraft}
              >
                <Save className="mr-2 h-4 w-4" />
                {currentDraftId ? 'Update Draft' : 'Save as Draft'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="col-span-1 lg:col-span-1 order-1 lg:order-2">
          {/* Platform Selection */}
          <Card variant="elevated" className="lg:sticky lg:top-6 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Platforms</CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-600">Choose where to publish</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                      selectedPlatforms.includes(platform.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className="text-lg">{platform.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{platform.name}</p>
                      <p className="text-xs text-gray-500">
                        {platform.charLimit.toLocaleString()} chars
                      </p>
                    </div>
                    {selectedPlatforms.includes(platform.id) && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                    )}
                  </button>
                ))}
              </div>
              
              {selectedPlatforms.length > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <p className="text-sm font-medium text-green-800">
                    {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''} selected
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedPlatforms.map(id => {
                      const platform = platforms.find(p => p.id === id)
                      return (
                        <span key={id} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg text-xs font-medium shadow-sm border border-green-100">
                          <span>{platform?.icon}</span>
                          <span>{platform?.name}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Pinterest Board Selection */}
              <PinterestBoardSelector
                selectedPlatforms={selectedPlatforms}
                selectedPinterestBoard={selectedPinterestBoard}
                setSelectedPinterestBoard={setSelectedPinterestBoard}
                pinterestTitle={pinterestTitle}
                setPinterestTitle={setPinterestTitle}
                pinterestDescription={pinterestDescription}
                setPinterestDescription={setPinterestDescription}
                pinterestLink={pinterestLink}
                setPinterestLink={setPinterestLink}
                pinterestBoards={pinterestBoards}
                setPinterestBoards={setPinterestBoards}
              />

              {/* YouTube Video Metadata */}
              {selectedPlatforms.includes('youtube') && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-red-600">▶</span>
                      YouTube Video Settings
                    </CardTitle>
                    <CardDescription>
                      Configure your YouTube video details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <VideoUpload
                      videoFile={youtubeVideoFile}
                      thumbnailFile={youtubeThumbnailFile}
                      onVideoChange={setYoutubeVideoFile}
                      onThumbnailChange={setYoutubeThumbnailFile}
                    />
                    <VideoMetadata
                      title={youtubeTitle}
                      description={youtubeDescription || postContent.replace(/<[^>]*>/g, '')}
                      tags={youtubeTags}
                      categoryId={youtubeCategoryId}
                      privacyStatus={youtubePrivacyStatus}
                      onTitleChange={setYoutubeTitle}
                      onDescriptionChange={setYoutubeDescription}
                      onTagsChange={setYoutubeTags}
                      onCategoryChange={setYoutubeCategoryId}
                      onPrivacyChange={setYoutubePrivacyStatus}
                    />
                  </CardContent>
                </Card>
              )}
              
              {/* TikTok Video Settings */}
              {selectedPlatforms.includes('tiktok') && (
                <div className="mt-6">
                  <TikTokVideoSettings
                    privacyLevel={tiktokPrivacyLevel}
                    setPrivacyLevel={setTiktokPrivacyLevel}
                    saveAsDraft={tiktokSaveAsDraft}
                    setSaveAsDraft={setTiktokSaveAsDraft}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Suggestions Modal */}
      <AISuggestionsModal
        open={showAISuggestions}
        onOpenChange={setShowAISuggestions}
        content={postContent}
        platforms={selectedPlatforms}
        onSelectSuggestion={handleAISuggestionSelect}
      />
      </SubscriptionGate>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )
}

export default function CreateNewPostPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CreateNewPostPageContent />
    </Suspense>
  )
}
