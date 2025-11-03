'use client'

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { PostingService, PostData } from '@/lib/posting/service'
import { PostingProgressTracker } from '@/lib/posting/progress-tracker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccountSelector } from '@/components/dashboard/account-selector'

// Lazy load the rich text editor to reduce initial bundle size
const RichTextEditor = dynamic(
  () => import('@/components/ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })),
  { 
    ssr: false,
    loading: () => (
      <div className="border rounded-lg p-4 min-h-[200px] animate-pulse bg-gray-50">
        <div className="flex gap-2 mb-3 border-b pb-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-8 h-8 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="space-y-2 mt-4">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    )
  }
)
import { AISuggestionsModal } from '@/components/dashboard/ai-suggestions-modal'
import { SubscriptionGateNoSuspense as SubscriptionGate } from '@/components/subscription/subscription-gate-no-suspense'
import { PreviewPanel } from '@/components/create/preview/PreviewPanel'
import { RequestPlatformModal } from '@/components/create/RequestPlatformModal'
import { QuickScheduleButtons } from '@/components/scheduling/QuickScheduleButtons'
import { CompactDateTimeInput } from '@/components/scheduling/CompactDateTimeInput'
import { createBrowserClient } from '@supabase/ssr'

// Dynamically import platform-specific components to avoid hydration issues
const PinterestBoardSelector = dynamic(() => import('@/components/pinterest/board-selector').then(mod => ({ default: mod.PinterestBoardSelector })), { ssr: false })
const VideoMetadata = dynamic(() => import('@/components/youtube/video-metadata'), { ssr: false })
const VideoUpload = dynamic(() => import('@/components/youtube/video-upload'), { ssr: false })
const TikTokVideoSettings = dynamic(() => import('@/components/tiktok/video-settings').then(mod => ({ default: mod.TikTokVideoSettings })), { ssr: false })
const ThreadComposer = dynamic(() => import('@/components/threads/thread-composer').then(mod => ({ default: mod.ThreadComposer })), { ssr: false })
// Phase 1 Quick Wins - New platform-specific components
const LinkedInVisibilitySelector = dynamic(() => import('@/components/linkedin/visibility-selector').then(mod => ({ default: mod.LinkedInVisibilitySelector })), { ssr: false })
const YouTubeComplianceSettings = dynamic(() => import('@/components/youtube/compliance-settings').then(mod => ({ default: mod.YouTubeComplianceSettings })), { ssr: false })
const ThreadsReplyControls = dynamic(() => import('@/components/threads/reply-controls').then(mod => ({ default: mod.ThreadsReplyControls })), { ssr: false })
const AltTextInput = dynamic(() => import('@/components/shared/alt-text-input').then(mod => ({ default: mod.AltTextInput })), { ssr: false })
// Phase 2A Instagram Quick Wins - New Instagram components
const InstagramCommentControls = dynamic(() => import('@/components/instagram/comment-controls').then(mod => ({ default: mod.InstagramCommentControls })), { ssr: false })
const InstagramLocationPicker = dynamic(() => import('@/components/instagram/location-picker').then(mod => ({ default: mod.InstagramLocationPicker })), { ssr: false })
// Phase 3 Community Controls - Bluesky and Facebook
const BlueskyReplyControls = dynamic(() => import('@/components/bluesky/reply-controls').then(mod => ({ default: mod.BlueskyReplyControls })), { ssr: false })
const FacebookPublishControls = dynamic(() => import('@/components/facebook/publish-controls').then(mod => ({ default: mod.FacebookPublishControls })), { ssr: false })
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
  Loader2,
  Eye,
  GripVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { extractVideoThumbnail, isVideoFile } from '@/lib/utils/video-thumbnail'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAutoSave } from '@/hooks/useAutoSave'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const platforms = [
  { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', charLimit: 280, gradient: 'from-gray-50 to-slate-50', borderColor: 'border-gray-200' },
  { id: 'instagram', name: 'Instagram', icon: '📷', charLimit: 2200, gradient: 'from-purple-50 to-pink-50', borderColor: 'border-purple-200' },
  { id: 'facebook', name: 'Facebook', icon: 'f', charLimit: 63206, gradient: 'from-blue-50 to-sky-50', borderColor: 'border-blue-200' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', charLimit: 3000, gradient: 'from-indigo-50 to-blue-50', borderColor: 'border-indigo-200' },
  { id: 'youtube', name: 'YouTube', icon: '▶', charLimit: 5000, gradient: 'from-red-50 to-rose-50', borderColor: 'border-red-200' },
  { id: 'tiktok', name: 'TikTok', icon: '♪', charLimit: 2200, gradient: 'from-pink-50 to-purple-50', borderColor: 'border-pink-200' },
  { id: 'threads', name: 'Threads', icon: '@', charLimit: 500, gradient: 'from-slate-50 to-gray-50', borderColor: 'border-slate-200' },
  { id: 'bluesky', name: 'Bluesky', icon: '🦋', charLimit: 300, gradient: 'from-sky-50 to-cyan-50', borderColor: 'border-sky-200' },
  { id: 'pinterest', name: 'Pinterest', icon: 'P', charLimit: 500, gradient: 'from-red-50 to-pink-50', borderColor: 'border-red-200' },
  { id: 'request', name: 'Request Platform', icon: '➕', charLimit: 0, gradient: 'from-green-50 to-emerald-50', borderColor: 'border-green-200', isSpecial: true },
]

// Sortable media item component for drag-and-drop reordering
interface SortableMediaItemProps {
  url: string
  index: number
  isVideo: boolean
  onRemove: () => void
}

function SortableMediaItem({ url, index, isVideo, onRemove }: SortableMediaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative group cursor-grab active:cursor-grabbing",
        isDragging && "z-50"
      )}
    >
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative border-2 border-transparent hover:border-blue-300 transition-all">
        {isVideo ? (
          <div className="relative w-full h-full bg-black">
            <video
              src={url}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 rounded-full p-3 shadow-lg">
                <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <img
            src={url}
            alt={`Media ${index + 1}`}
            className="w-full h-full object-cover"
          />
        )}

        {/* Number badge */}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-900 rounded-full w-7 h-7 flex items-center justify-center text-sm font-semibold shadow-md pointer-events-none">
          {index + 1}
        </div>

        {/* Drag handle - visual indicator */}
        <div className="absolute top-2 right-2 bg-gray-800/80 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute -bottom-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-md z-10 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Hover hint */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <p className="text-white text-xs text-center font-medium">Drag to reorder</p>
      </div>
    </div>
  )
}

function CreateNewPostPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [postContent, setPostContent] = useState('')
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string[]>>({})
  const [instagramAsStory, setInstagramAsStory] = useState(false)
  const [instagramAsReel, setInstagramAsReel] = useState(false)
  const [instagramFormat, setInstagramFormat] = useState<'feed-square' | 'feed-portrait' | 'feed-landscape' | 'story' | 'reel'>('feed-portrait')
  const [facebookAsStory, setFacebookAsStory] = useState(false)
  const [facebookAsReel, setFacebookAsReel] = useState(false)
  const [platformContent, setPlatformContent] = useState<Record<string, string>>({})
  const [showPlatformCustomization, setShowPlatformCustomization] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadedMediaUrls, setUploadedMediaUrls] = useState<string[]>([])
  const [uploadedMediaTypes, setUploadedMediaTypes] = useState<string[]>([])
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [editingScheduledPost, setEditingScheduledPost] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [shouldAutoPublish, setShouldAutoPublish] = useState(false)
  const [shouldAutoSchedule, setShouldAutoSchedule] = useState(false)
  const [showRequestPlatformModal, setShowRequestPlatformModal] = useState(false)

  // Ref for preview panel to enable auto-scroll on mobile
  const previewPanelRef = useRef<HTMLDivElement>(null)

  // Set up drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end event to reorder images
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setUploadedMediaUrls((items) => {
        // Extract indices from the ID (format: url + index)
        const activeId = active.id as string
        const overId = over.id as string

        // Find indices by matching the constructed IDs
        const oldIndex = items.findIndex((media, idx) => getMediaUrl(media) + idx === activeId)
        const newIndex = items.findIndex((media, idx) => getMediaUrl(media) + idx === overId)

        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(items, oldIndex, newIndex)
        }
        return items
      })
    }
  }

  // Memoize file preview URLs to prevent re-creation on every render
  const filePreviewUrls = useMemo(() => {
    const urls = selectedFiles.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));

    // Cleanup function to revoke URLs when files change
    return urls;
  }, [selectedFiles])

  // Cleanup blob URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      filePreviewUrls.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [filePreviewUrls])

  // Combine uploaded URLs and file blob URLs for preview
  const previewMediaUrls = useMemo(() => {
    // Combine uploaded URLs and blob URLs from new files
    const blobUrls = filePreviewUrls.map(({ url }) => url)
    return [...uploadedMediaUrls, ...blobUrls]
  }, [uploadedMediaUrls, filePreviewUrls])

  // Fetch connected accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: accounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('platform')
        .order('is_primary', { ascending: false })
      
      if (accounts) {
        setConnectedAccounts(accounts)
        
        // Initialize selected accounts with primary accounts
        const initialSelected: Record<string, string[]> = {}
        accounts.forEach(account => {
          if (!initialSelected[account.platform]) {
            initialSelected[account.platform] = []
          }
          if (account.is_primary || !initialSelected[account.platform].length) {
            initialSelected[account.platform] = [account.id]
          }
        })
        setSelectedAccounts(initialSelected)
      }
    }
    
    fetchAccounts()
  }, [])

  // Load scheduled post for editing if scheduledPostId is in query params
  useEffect(() => {
    const scheduledPostId = searchParams.get('scheduledPostId')

    if (scheduledPostId && !editingScheduledPost) {
      const loadScheduledPost = async () => {
        try {
          setLoadingDraft(true)
          setEditingScheduledPost(true)

          const response = await fetch(`/api/posts/scheduled/${scheduledPostId}`)

          if (!response.ok) {
            throw new Error('Failed to load scheduled post')
          }

          const { post } = await response.json()

          // Populate form with post data
          setPostContent(post.content || '')
          setSelectedPlatforms(post.platforms || [])
          setPlatformContent(post.platform_content || {})
          setUploadedMediaUrls(post.media_urls || [])

          // Set schedule time
          if (post.scheduled_for) {
            const scheduledDate = new Date(post.scheduled_for)
            const dateStr = scheduledDate.toISOString().split('T')[0] // YYYY-MM-DD
            const timeStr = scheduledDate.toTimeString().slice(0, 5) // HH:MM
            setScheduledDate(dateStr)
            setScheduledTime(timeStr)
          }

          toast.success('Scheduled post loaded for editing')
        } catch (error) {
          console.error('Error loading scheduled post:', error)
          toast.error('Failed to load scheduled post')
          router.push('/dashboard/create/new') // Remove query param
        } finally {
          setLoadingDraft(false)
        }
      }

      loadScheduledPost()
    }
  }, [searchParams, editingScheduledPost, router])

  // Threads-specific state
  const [threadsMode, setThreadsMode] = useState<'single' | 'thread'>('single')
  const [threadPosts, setThreadPosts] = useState<string[]>([''])
  const [threadsThreadMedia, setThreadsThreadMedia] = useState<(File[] | undefined)[]>([])
  
  // Twitter-specific state
  // Hardcoded to false to disable thread mode and hide Twitter Options card
  const enableTwitterThreads = false // process.env.NEXT_PUBLIC_ENABLE_TWITTER_THREADS === 'true'
  const [twitterMode, setTwitterMode] = useState<'single' | 'thread'>('single')
  const [twitterThreadPosts, setTwitterThreadPosts] = useState<string[]>([''])
  const [twitterThreadMedia, setTwitterThreadMedia] = useState<(File[] | undefined)[]>([])

  // Force single mode when threads are disabled
  useEffect(() => {
    if (!enableTwitterThreads && twitterMode === 'thread') {
      setTwitterMode('single')
    }
  }, [enableTwitterThreads, twitterMode])

  const loadedDraftRef = useRef<string | null>(null)
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
  const [youtubeAsShort, setYoutubeAsShort] = useState(false)

  // Debug YouTube state changes
  useEffect(() => {
    console.log('YouTube state updated:', {
      videoFile: youtubeVideoFile,
      title: youtubeTitle,
      hasVideo: !!youtubeVideoFile,
      hasTitle: !!(youtubeTitle && youtubeTitle.trim())
    })
  }, [youtubeVideoFile, youtubeTitle])

  // YouTube video preview thumbnail (extracted from video if no custom thumbnail)
  const [youtubeVideoThumbnail, setYoutubeVideoThumbnail] = useState<string | null>(null)

  // Extract thumbnail from video when video changes and no custom thumbnail
  useEffect(() => {
    let mounted = true
    let objectUrl: string | null = null

    async function extractThumbnail() {
      if (!youtubeVideoFile || youtubeThumbnailFile) {
        setYoutubeVideoThumbnail(null)
        return
      }

      try {
        const { extractVideoThumbnail } = await import('@/lib/video-thumbnail')
        const thumbnailBlob = await extractVideoThumbnail(youtubeVideoFile, {
          width: 1280,
          height: 720,
          seekTime: 1
        })

        if (mounted && thumbnailBlob) {
          objectUrl = URL.createObjectURL(thumbnailBlob)
          setYoutubeVideoThumbnail(objectUrl)
        } else if (mounted) {
          setYoutubeVideoThumbnail(null)
        }
      } catch (error) {
        console.error('Error extracting video thumbnail:', error)
        if (mounted) {
          setYoutubeVideoThumbnail(null)
        }
      }
    }

    extractThumbnail()

    return () => {
      mounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [youtubeVideoFile, youtubeThumbnailFile])

  // YouTube-specific preview URLs (video/thumbnail)
  const youtubePreviewUrls = useMemo(() => {
    const urls: string[] = []
    // Prioritize custom thumbnail, then extracted thumbnail from video
    if (youtubeThumbnailFile) {
      urls.push(URL.createObjectURL(youtubeThumbnailFile))
    } else if (youtubeVideoThumbnail) {
      urls.push(youtubeVideoThumbnail)
    }
    return urls
  }, [youtubeThumbnailFile, youtubeVideoThumbnail])

  // TikTok states - Updated for TikTok audit compliance
  const [tiktokTitle, setTiktokTitle] = useState('')
  const [tiktokPrivacyLevel, setTiktokPrivacyLevel] = useState<'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY' | ''>('') // NO default - user must select
  const [tiktokAllowComment, setTiktokAllowComment] = useState(false)
  const [tiktokAllowDuet, setTiktokAllowDuet] = useState(false)
  const [tiktokAllowStitch, setTiktokAllowStitch] = useState(false)
  const [tiktokContentDisclosure, setTiktokContentDisclosure] = useState(false)
  const [tiktokPromotionalContent, setTiktokPromotionalContent] = useState(false)
  const [tiktokBrandedContent, setTiktokBrandedContent] = useState(false)
  const [tiktokPhotoCoverIndex, setTiktokPhotoCoverIndex] = useState(0) // Photo cover index for photo posts

  // LinkedIn states - Phase 1 Quick Wins
  const [linkedinVisibility, setLinkedinVisibility] = useState<'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN'>('PUBLIC')

  // YouTube compliance states - Phase 1 Quick Wins (COPPA compliance)
  const [youtubeMadeForKids, setYoutubeMadeForKids] = useState<boolean | null>(null) // null = not selected yet
  const [youtubeEmbeddable, setYoutubeEmbeddable] = useState(true)
  const [youtubeLicense, setYoutubeLicense] = useState<'youtube' | 'creativeCommon'>('youtube')

  // Threads states - Phase 1 Quick Wins
  const [threadsReplyControl, setThreadsReplyControl] = useState<'everyone' | 'accounts_you_follow' | 'mentioned_only'>('everyone')

  // Alt text states - Phase 1 Quick Wins (Accessibility)
  const [instagramAltText, setInstagramAltText] = useState('')
  const [pinterestAltText, setPinterestAltText] = useState('')
  const [blueskyAltText, setBlueskyAltText] = useState('')

  // Instagram states - Phase 2A Quick Wins
  const [instagramLocation, setInstagramLocation] = useState<{ id: string; name: string } | null>(null)
  const [instagramDisableComments, setInstagramDisableComments] = useState(false)

  // Bluesky reply controls state - Phase 3 Community Controls
  const [blueskyReplyControl, setBlueskyReplyControl] = useState<'everyone' | 'nobody' | 'following' | 'mentioned'>('everyone')

  // Facebook publish controls state - Phase 3 Community Controls
  const [facebookPublishAsDraft, setFacebookPublishAsDraft] = useState(false)

  // Auto-save hook - automatically saves draft every 30 seconds
  const { lastSaved, isSaving, error: autoSaveError, timeAgo, currentDraftId: autoSaveDraftId } = useAutoSave(
    {
      content: postContent,
      platforms: selectedPlatforms,
      platformContent,
      mediaUrls: uploadedMediaUrls
    },
    currentDraftId,
    {
      enabled: !editingScheduledPost && !shouldAutoPublish && !shouldAutoSchedule // Don't auto-save when editing scheduled posts
    }
  )

  // Update currentDraftId when auto-save creates a new draft
  useEffect(() => {
    if (autoSaveDraftId && !currentDraftId) {
      setCurrentDraftId(autoSaveDraftId)
    }
  }, [autoSaveDraftId, currentDraftId])

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const hasUnsavedChanges = postContent.trim() !== '' || selectedPlatforms.length > 0 || uploadedMediaUrls.length > 0

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isSaving) {
        e.preventDefault()
        e.returnValue = '' // Chrome requires returnValue to be set
      }
    }

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [postContent, selectedPlatforms, uploadedMediaUrls, isSaving])

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => {
      const newPlatforms = prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
      
      // If Twitter is being deselected, reset Twitter mode
      if (platformId === 'twitter' && prev.includes('twitter') && !newPlatforms.includes('twitter')) {
        setTwitterMode('single')
        setTwitterThreadPosts([''])
      }
      
      return newPlatforms
    })
  }

  const handleContentChange = (content: string) => {
    setPostContent(content)
    // Don't automatically sync to platform content - let users explicitly customize if needed
  }

  const handlePlatformContentChange = (platformId: string, content: string) => {
    setPlatformContent(prev => ({ ...prev, [platformId]: content }))
  }

  const handleAISuggestionSelect = (suggestion: string) => {
    // Convert plain text to HTML format for rich text editor
    // Preserve emojis and line breaks properly

    // First, convert **text** to <strong>text</strong>
    let processedSuggestion = suggestion
    if (processedSuggestion.includes('**')) {
      processedSuggestion = processedSuggestion.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    }

    // Replace all single \n with <br> for line breaks
    // Replace \n\n with </p><p> for paragraph breaks
    let htmlContent = processedSuggestion
      .split('\n\n')
      .map(paragraph => {
        // Within each paragraph, convert single line breaks to <br>
        const withBreaks = paragraph.split('\n').join('<br>')
        return `<p>${withBreaks}</p>`
      })
      .join('')

    setPostContent(htmlContent)
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

  // Helper to get URL from either string or object format
  const getMediaUrl = (media: any): string => {
    return typeof media === 'string' ? media : media.url
  }

  // Upload files immediately when selected (for autosave functionality)
  const uploadFilesImmediately = async (files: File[]): Promise<any[]> => {
    if (files.length === 0) return []

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Please sign in to upload files')
      return []
    }

    // Validate video sizes for Bluesky
    if (selectedPlatforms.includes('bluesky')) {
      const BLUESKY_VIDEO_SIZE_LIMIT = 900 * 1024 // 900KB (safety margin below 976.56KB limit)

      for (const file of files) {
        if (file.type.startsWith('video/')) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)

          if (file.size > BLUESKY_VIDEO_SIZE_LIMIT) {
            toast.error(
              `Video "${file.name}" is ${fileSizeMB}MB, but Bluesky has a 1MB limit. Please compress your video or deselect Bluesky.`,
              { duration: 8000 }
            )
            return []
          }
        }
      }
    }

    const uploadedUrls: any[] = []
    const hasVideos = files.some(file => file.type.startsWith('video/'))

    toast.info(`Uploading ${files.length} file(s)...`, { duration: 2000 })

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        // Generate unique filename
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 8)
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${timestamp}-${randomString}.${fileExt}`

        // Always upload directly to Supabase Storage for consistency
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

        // Check if this is a video file and extract thumbnail
        if (isVideoFile(file)) {
          let thumbnailUrl: string | null = null

          try {
            const thumbnailFile = await extractVideoThumbnail(file)
            if (thumbnailFile) {
              // Upload thumbnail
              const thumbFileName = `${user.id}/${timestamp}-${randomString}_thumb.jpg`
              const { error: thumbError } = await supabase.storage
                .from('post-media')
                .upload(thumbFileName, thumbnailFile)

              if (!thumbError) {
                const { data: { publicUrl: thumbUrl } } = supabase.storage
                  .from('post-media')
                  .getPublicUrl(thumbFileName)
                thumbnailUrl = thumbUrl
              }
            }
          } catch (thumbError) {
            console.error('Failed to extract video thumbnail:', thumbError)
            // Continue without thumbnail
          }

          // Store as object with thumbnail
          uploadedUrls.push({
            url: publicUrl,
            thumbnailUrl: thumbnailUrl,
            type: 'video',
            mimeType: file.type
          })
        } else {
          // Store as object for images
          uploadedUrls.push({
            url: publicUrl,
            type: 'image',
            mimeType: file.type
          })
        }
      } catch (error) {
        console.error('Upload error for file:', file.name, error)
        toast.error(`Failed to upload ${file.name}`)
      }
    }

    if (uploadedUrls.length > 0) {
      toast.success(`Uploaded ${uploadedUrls.length} file(s) successfully`)
    }

    return uploadedUrls
  }

  const uploadFiles = async (): Promise<string[]> => {
    // If files are already uploaded, return those URLs
    if (uploadedMediaUrls.length > 0) {
      return uploadedMediaUrls
    }

    if (selectedFiles.length === 0) return []

    // Check if we have video files
    const hasVideos = selectedFiles.some(file => file.type.startsWith('video/'))

    // Validate video sizes for Bluesky
    if (selectedPlatforms.includes('bluesky') && hasVideos) {
      const BLUESKY_VIDEO_SIZE_LIMIT = 900 * 1024 // 900KB (safety margin below 976.56KB limit)

      for (const file of selectedFiles) {
        if (file.type.startsWith('video/')) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)

          if (file.size > BLUESKY_VIDEO_SIZE_LIMIT) {
            toast.error(
              `Video "${file.name}" is ${fileSizeMB}MB, but Bluesky has a 1MB limit. Please compress your video or deselect Bluesky.`,
              { duration: 8000 }
            )
            return []
          }
        }
      }
    }

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

    // Special handling for Threads thread mode
    const isThreadsThreadMode = selectedPlatforms.length === 1 && 
      selectedPlatforms[0] === 'threads' && 
      threadsMode === 'thread'
    
    // Special handling for Twitter thread mode
    const isTwitterThreadMode = selectedPlatforms.length === 1 && 
      selectedPlatforms[0] === 'twitter' && 
      twitterMode === 'thread'
    
    if (isThreadsThreadMode) {
      // For Threads thread mode, check threadPosts instead of main content
      console.log('Threads thread mode validation:', {
        threadPosts,
        threadPostsLength: threadPosts.length,
        hasContent: threadPosts.some(p => p && p.trim().length > 0)
      })
      const hasThreadContent = threadPosts.some(p => p && p.trim().length > 0)
      if (!hasThreadContent) {
        toast.error('Please add content to at least one thread post')
        return
      }
      // If we have thread content, skip all other content validation
      // and proceed directly with posting logic
    } else if (isTwitterThreadMode) {
      // For Twitter thread mode, check twitterThreadPosts instead of main content
      const hasTwitterThreadContent = twitterThreadPosts.some(p => p && typeof p === 'string' && p.trim().length > 0)
      if (!hasTwitterThreadContent) {
        toast.error('Please add content to at least one tweet in your thread')
        return
      }
      // If we have thread content, skip all other content validation
      // and proceed directly with posting logic
    }
    
    // Regular content validation (not thread mode)
    console.log('About to check regular validation. isThreadsThreadMode:', isThreadsThreadMode, 'isTwitterThreadMode:', isTwitterThreadMode)
    if (!isThreadsThreadMode && !isTwitterThreadMode) {
      console.log('Entering regular validation block')

    // Check if we have content either in main area or platform-specific
    const hasMainContent = postContent.trim().length > 0
    const hasPlatformContent = selectedPlatforms.some(platform => 
      platformContent[platform]?.trim().length > 0
    )
    
    // Special handling for YouTube - video is the content
    const hasYouTubeContent = selectedPlatforms.includes('youtube') && 
      youtubeVideoFile !== null && 
      youtubeTitle && youtubeTitle.trim().length > 0
    
    // Special handling for Instagram Stories - no caption required
    const isInstagramStoryOnly = selectedPlatforms.length === 1 && 
      selectedPlatforms[0] === 'instagram' && 
      instagramAsStory && 
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)
    
    // Check if Instagram Story is selected (even with other platforms)
    const hasInstagramStory = selectedPlatforms.includes('instagram') &&
      instagramAsStory &&
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)

    // Special handling for Facebook Stories - no caption required
    const isFacebookStoryOnly = selectedPlatforms.length === 1 &&
      selectedPlatforms[0] === 'facebook' &&
      facebookAsStory &&
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)

    // Special handling for Facebook Reels - caption optional
    const isFacebookReelOnly = selectedPlatforms.length === 1 &&
      selectedPlatforms[0] === 'facebook' &&
      facebookAsReel &&
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)

    // Check if Facebook Story or Reel is selected (even with other platforms)
    const hasFacebookStory = selectedPlatforms.includes('facebook') &&
      facebookAsStory &&
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)

    const hasFacebookReel = selectedPlatforms.includes('facebook') &&
      facebookAsReel &&
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)

    // Special handling for Facebook feed posts - caption optional with media
    const isFacebookFeedOnly = selectedPlatforms.length === 1 &&
      selectedPlatforms[0] === 'facebook' &&
      !facebookAsStory &&
      !facebookAsReel &&
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)

    // Debug logging for Instagram Story
    console.log('Instagram Story Debug:', {
      selectedPlatforms,
      instagramAsStory,
      selectedFilesCount: selectedFiles.length,
      uploadedMediaUrlsCount: uploadedMediaUrls.length,
      isInstagramStoryOnly,
      hasInstagramStory
    })
    
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
                          uploadedMediaUrls.some(media => {
                            const url = getMediaUrl(media)
                            return url.includes('.mp4') || url.includes('.mov') || url.includes('.avi')
                          })
    
    // Special handling for TikTok - requires video
    const hasTikTokContent = selectedPlatforms.includes('tiktok') && hasVideoFiles
    
    // Check content requirements - special handling for platform-specific content
    const isYouTubeOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'youtube'
    const isPinterestOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'pinterest'
    const isTikTokOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'tiktok'
    
    // Content validation with platform-specific rules
    console.log('Validation check - isInstagramStoryOnly:', isInstagramStoryOnly)
    
    if (isInstagramStoryOnly) {
      console.log('Instagram Story Only path')
      // Instagram Stories only need media, not captions
      if (selectedFiles.length === 0 && uploadedMediaUrls.length === 0) {
        toast.error('Please select an image or video for your story')
        return
      }
      console.log('Instagram Story validation passed')
      // Instagram Story validation passed - skip all other content checks
    } else if (isFacebookStoryOnly) {
      console.log('Facebook Story Only path')
      // Facebook Stories only need media, not captions
      if (selectedFiles.length === 0 && uploadedMediaUrls.length === 0) {
        toast.error('Please select an image or video for your Facebook story')
        return
      }
      console.log('Facebook Story validation passed')
      // Facebook Story validation passed - skip all other content checks
    } else if (isFacebookReelOnly) {
      console.log('Facebook Reel Only path')
      // Facebook Reels only need video, caption is optional
      if (selectedFiles.length === 0 && uploadedMediaUrls.length === 0) {
        toast.error('Please select a video for your Facebook reel')
        return
      }
      console.log('Facebook Reel validation passed')
      // Facebook Reel validation passed - skip all other content checks
    } else if (isFacebookFeedOnly) {
      console.log('Facebook Feed Only path')
      // Facebook feed posts with media don't require captions
      if (selectedFiles.length === 0 && uploadedMediaUrls.length === 0) {
        toast.error('Please select an image or video for your Facebook post')
        return
      }
      console.log('Facebook Feed validation passed')
      // Facebook Feed validation passed - skip all other content checks
    } else if (isYouTubeOnly) {
      // YouTube-only posts need video and title
      if (!youtubeVideoFile) {
        console.log('YouTube-only: no video file detected')
        toast.error('YouTube requires a video file')
        return
      }
      if (!youtubeTitle || !youtubeTitle.trim()) {
        toast.error('YouTube requires a video title')
        return
      }
      // YouTube validation passed
    } else if (isPinterestOnly && hasPinterestContent) {
      // Pinterest has its content (board + image) - validation passed
    } else if (isTikTokOnly && hasTikTokContent) {
      // TikTok has its content (video) - validation passed
    } else if (hasInstagramStory && selectedPlatforms.length > 1) {
      // Mixed platforms including Instagram Story
      const otherPlatforms = selectedPlatforms.filter(p => p !== 'instagram')
      // Instagram Story only needs media (already checked in hasInstagramStory)
      // Check if other platforms have content
      const otherPlatformsHaveContent = hasMainContent || hasPlatformContent ||
        otherPlatforms.some(p => p === 'pinterest' && hasPinterestContent) ||
        otherPlatforms.some(p => p === 'youtube' && hasYouTubeContent) ||
        otherPlatforms.some(p => p === 'tiktok' && hasTikTokContent) ||
        otherPlatforms.some(p => p === 'facebook' && hasFacebookStory) ||
        otherPlatforms.some(p => p === 'facebook' && hasFacebookReel)

      if (!otherPlatformsHaveContent) {
        toast.error('Please enter content for non-Instagram platforms')
        return
      }
    } else if (hasFacebookStory && selectedPlatforms.length > 1) {
      // Mixed platforms including Facebook Story
      const otherPlatforms = selectedPlatforms.filter(p => p !== 'facebook')
      // Facebook Story only needs media (already checked in hasFacebookStory)
      // Check if other platforms have content
      const otherPlatformsHaveContent = hasMainContent || hasPlatformContent ||
        otherPlatforms.some(p => p === 'pinterest' && hasPinterestContent) ||
        otherPlatforms.some(p => p === 'youtube' && hasYouTubeContent) ||
        otherPlatforms.some(p => p === 'tiktok' && hasTikTokContent) ||
        otherPlatforms.some(p => p === 'instagram' && hasInstagramStory)

      if (!otherPlatformsHaveContent) {
        toast.error('Please enter content for non-Facebook platforms')
        return
      }
    } else if (hasFacebookReel && selectedPlatforms.length > 1) {
      // Mixed platforms including Facebook Reel
      const otherPlatforms = selectedPlatforms.filter(p => p !== 'facebook')
      // Facebook Reel only needs video (already checked in hasFacebookReel)
      // Check if other platforms have content
      const otherPlatformsHaveContent = hasMainContent || hasPlatformContent ||
        otherPlatforms.some(p => p === 'pinterest' && hasPinterestContent) ||
        otherPlatforms.some(p => p === 'youtube' && hasYouTubeContent) ||
        otherPlatforms.some(p => p === 'tiktok' && hasTikTokContent) ||
        otherPlatforms.some(p => p === 'instagram' && hasInstagramStory)

      if (!otherPlatformsHaveContent) {
        toast.error('Please enter content for non-Facebook platforms')
        return
      }
    } else if (!hasMainContent && !hasPlatformContent && !hasYouTubeContent && !hasPinterestContent && !hasTikTokContent && !isThreadsThreadMode && !isTwitterThreadMode && !isFacebookStoryOnly && !isFacebookReelOnly && !isFacebookFeedOnly && !isInstagramStoryOnly) {
      // No content at all for regular posts (skip this check for Threads thread mode, Twitter thread mode, Facebook Stories/Reels/Feed, Instagram Stories)
      console.log('No content validation path - failing')
      console.log('Validation state:', {
        hasMainContent,
        hasPlatformContent,
        hasYouTubeContent,
        hasPinterestContent,
        hasTikTokContent,
        hasInstagramStory,
        isInstagramStoryOnly,
        isFacebookStoryOnly,
        isFacebookReelOnly,
        isFacebookFeedOnly,
        isThreadsThreadMode,
        isTwitterThreadMode
      })
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
    
    // TikTok-specific validation - Updated for TikTok audit compliance
    if (selectedPlatforms.includes('tiktok')) {
      const hasImageFiles = selectedFiles.some(f => f.type.startsWith('image/')) || uploadedMediaUrls.some(media => getMediaUrl(media).match(/\.(jpg|jpeg|png|gif|webp)$/i))
      const hasVideoFiles = selectedFiles.some(f => f.type.startsWith('video/')) || uploadedMediaUrls.some(media => getMediaUrl(media).match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i))

      // TikTok requires either video or photo
      if (!hasVideoFiles && !hasImageFiles) {
        toast.error('TikTok requires at least one video or photo')
        return
      }

      // Privacy level is REQUIRED (no default allowed)
      if (!tiktokPrivacyLevel) {
        toast.error('Please select a privacy level for TikTok')
        return
      }

      // Commercial content disclosure validation
      if (tiktokContentDisclosure && !tiktokPromotionalContent && !tiktokBrandedContent) {
        toast.error('TikTok: Please select at least one commercial content option or disable content disclosure')
        return
      }

      // Branded content cannot be private
      if (tiktokBrandedContent && tiktokPrivacyLevel === 'SELF_ONLY') {
        toast.error('TikTok: Branded content cannot be posted with private visibility. Please select Public or Friends.')
        return
      }
    }

    } // End of if block for regular content validation (not thread mode)

    // Filter to only supported platforms for now
    const supportedPlatforms = selectedPlatforms.filter(p => ['twitter', 'instagram', 'facebook', 'bluesky', 'pinterest', 'tiktok', 'youtube', 'linkedin', 'threads'].includes(p))
    const unsupportedPlatforms = selectedPlatforms.filter(p => !['twitter', 'instagram', 'facebook', 'bluesky', 'pinterest', 'tiktok', 'youtube', 'linkedin', 'threads'].includes(p))

    if (supportedPlatforms.length === 0) {
      toast.error('Please select X (Twitter), Instagram, Facebook, Bluesky, Pinterest, TikTok, YouTube, LinkedIn, or Threads')
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
    
    // Create progress tracker for ALL posts (even single platform)
    const progressTracker = new PostingProgressTracker(supportedPlatforms);
    progressTracker.start();

    // Check if we're posting a video to Instagram (needs longer timeout)
    const hasInstagramVideoPost = selectedPlatforms.includes('instagram') && 
      selectedFiles.some(file => 
        file.type.startsWith('video/') || 
        ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'].some(ext => file.name.toLowerCase().endsWith(ext))
      );
    
    // Safety timeout to prevent button getting stuck
    // Instagram videos need much more time for processing (especially HD/4K videos)
    const timeoutDuration = hasInstagramVideoPost ? 300000 : 60000; // 5 minutes for IG video, 1 minute for others
    const timeoutId = setTimeout(() => {
      console.warn('Posting timeout - resetting button state')
      progressTracker.finish()
      setIsPosting(false)
      if (hasInstagramVideoPost) {
        toast.warning('Instagram video is taking longer than expected. It should still complete - check Instagram in a few moments.', {
          duration: 8000
        });
      } else {
        toast.error('Posting timed out - please try again');
      }
    }, timeoutDuration)

    try {
      // Upload files first if any, and include already uploaded media
      let mediaUrls: string[] = [...uploadedMediaUrls]  // Start with already uploaded URLs
      if (selectedFiles.length > 0) {
        const newMediaUrls = await uploadFiles()
        if (newMediaUrls.length === 0 && selectedFiles.length > 0) {
          toast.error('Failed to upload media files')
          progressTracker.finish();
          return
        }
        mediaUrls = [...mediaUrls, ...newMediaUrls]
        setUploadedMediaUrls(mediaUrls)
      }

      const postingService = new PostingService()
      
      // Check if we're posting a video to Instagram
      let instagramProgressToast: any = null;
      const hasInstagramVideo = supportedPlatforms.includes('instagram') && 
        mediaUrls.length > 0 && 
        mediaUrls.some(url => ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'].some(ext => url.toLowerCase().includes(ext)));
      
      if (hasInstagramVideo) {
        instagramProgressToast = toast.loading('Preparing Instagram video post...');
      }
      
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
      let youtubeThumbnailUrl: string | undefined; // Store the thumbnail image URL
      if (selectedPlatforms.includes('youtube') && youtubeVideoFile) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error('User not authenticated')

          // Prioritize custom thumbnail if provided, otherwise auto-extract from video
          if (youtubeThumbnailFile) {
            // Upload custom thumbnail to Supabase Storage
            progressTracker.updatePlatform('youtube', 'uploading', 'Uploading custom thumbnail...')

            const fileName = `${user.id}/${Date.now()}_youtube_custom_thumb.jpg`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('post-media')
              .upload(fileName, youtubeThumbnailFile, {
                contentType: youtubeThumbnailFile.type,
                upsert: false
              })

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('post-media')
                .getPublicUrl(fileName)

              youtubeThumbnailUrl = publicUrl
              console.log('Custom YouTube thumbnail uploaded to storage:', youtubeThumbnailUrl)
            } else {
              console.error('Failed to upload custom thumbnail:', uploadError)
            }
          } else {
            // Auto-extract thumbnail image from video to save storage space
            progressTracker.updatePlatform('youtube', 'uploading', 'Extracting thumbnail...')

            const { extractVideoThumbnail, blobToFile } = await import('@/lib/video-thumbnail')
            const thumbnailBlob = await extractVideoThumbnail(youtubeVideoFile, {
              width: 1280,
              height: 720,
              quality: 0.85
            })

            if (thumbnailBlob) {
              // Upload auto-extracted thumbnail to Supabase Storage
              const thumbnailFile = blobToFile(thumbnailBlob, `youtube_thumbnail_${Date.now()}.jpg`)
              const fileName = `${user.id}/${Date.now()}_youtube_thumb.jpg`

              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('post-media')
                .upload(fileName, thumbnailFile, {
                  contentType: 'image/jpeg',
                  upsert: false
                })

              if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                  .from('post-media')
                  .getPublicUrl(fileName)

                youtubeThumbnailUrl = publicUrl
                console.log('Auto-extracted YouTube thumbnail uploaded to storage:', youtubeThumbnailUrl)
              } else {
                console.error('Failed to upload auto-extracted thumbnail:', uploadError)
              }
            } else {
              console.warn('Could not extract video thumbnail, proceeding without thumbnail')
            }
          }

          // Now upload to YouTube
          progressTracker.updatePlatform('youtube', 'uploading', 'Uploading to YouTube...')

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
          progressTracker.updatePlatform('youtube', 'success', `Video uploaded to YouTube successfully! View at: ${result.video.url}`)
          
          // Store YouTube post in scheduled_posts table for analytics tracking
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              const postedTime = new Date().toISOString()
              await supabase
                .from('scheduled_posts')
                .insert({
                  user_id: user.id,
                  content: youtubeDescription || postContent,
                  platforms: ['youtube'],
                  platform_content: { youtube: youtubeDescription || postContent },
                  media_urls: youtubeThumbnailUrl ? [youtubeThumbnailUrl] : null, // Use thumbnail image URL
                  platform_media_url: youtubeThumbnailUrl, // Store thumbnail image URL
                  status: 'posted',
                  scheduled_for: postedTime, // Add this so posts appear in queries that order by scheduled_for
                  posted_at: postedTime,
                  post_results: [{
                    platform: 'youtube',
                    success: true,
                    postId: result.video.id,
                    url: result.video.url, // YouTube watch URL
                    data: {
                      title: youtubeTitle,
                      videoId: result.video.id,
                      url: result.video.url // YouTube watch URL
                    }
                  }]
                })
            }
          } catch (error) {
            console.error('Failed to store YouTube post in scheduled_posts:', error)
          }
          
          // Remove YouTube from platforms to post (since it's already posted)
          const platformsWithoutYouTube = supportedPlatforms.filter(p => p !== 'youtube')
          
          // If YouTube was the only platform, we're done
          if (platformsWithoutYouTube.length === 0) {
            progressTracker.finish()
            // Clear form
            setPostContent('')
            setPlatformContent({})
            setSelectedPlatforms([])
            setSelectedFiles([])
            setUploadedMediaUrls([])
            setUploadedMediaTypes([])
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
          progressTracker.updatePlatform('youtube', 'error', undefined, error instanceof Error ? error.message : 'Unknown error')
          progressTracker.finish()
          clearTimeout(timeoutId)
          setIsPosting(false)
          return
        }
      }

      // Handle Threads thread mode separately
      if (supportedPlatforms.length === 1 && supportedPlatforms[0] === 'threads' && threadsMode === 'thread' && threadPosts.length > 0) {
        // Get Threads account
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          progressTracker.updatePlatform('threads', 'error', undefined, 'User not authenticated')
          progressTracker.finish()
          clearTimeout(timeoutId)
          setIsPosting(false)
          return
        }

        const { data: threadsAccount } = await supabase
          .from('social_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('platform', 'threads')
          .eq('is_active', true)
          .single()

        if (!threadsAccount) {
          progressTracker.updatePlatform('threads', 'error', undefined, 'Threads account not connected')
          progressTracker.finish()
          clearTimeout(timeoutId)
          setIsPosting(false)
          return
        }

        console.log(`Posting thread for ${threadsAccount.username}`)
        console.log('Account details:', {
          username: threadsAccount.username,
          platform_user_id: threadsAccount.platform_user_id,
          token_preview: threadsAccount.access_token ? `${threadsAccount.access_token.substring(0, 20)}...` : 'null'
        })
        
        // Filter out empty posts BUT keep track of original indices for media
        const filteredThreadData: { text: string; originalIndex: number }[] = []
        threadPosts.forEach((post, index) => {
          if (post.trim().length > 0) {
            filteredThreadData.push({ text: post, originalIndex: index })
          }
        })
        
        const filteredPosts = filteredThreadData.map(d => d.text)
        
        // Upload media for each post that has it (Threads allows 1 image per post)
        const mediaUrlsPerPost: string[] = []
        if (threadsThreadMedia.some(m => m && m.length > 0)) {
          toast.info('Uploading media for thread...')
          
          for (let i = 0; i < filteredThreadData.length; i++) {
            const originalIndex = filteredThreadData[i].originalIndex
            const mediaFiles = threadsThreadMedia[originalIndex]
            if (mediaFiles && mediaFiles.length > 0) {
              // Threads only supports 1 media per post, take the first one
              const file = mediaFiles[0]
              try {
                // Generate unique filename
                const timestamp = Date.now()
                const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
                const filename = `threads-thread/${user.id}/${timestamp}-${sanitizedName}`
                
                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('post-media')
                  .upload(filename, file, {
                    contentType: file.type,
                    upsert: false
                  })
                
                if (uploadError) throw uploadError
                
                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                  .from('post-media')
                  .getPublicUrl(filename)
                
                mediaUrlsPerPost.push(publicUrl)
              } catch (error) {
                console.error('Error uploading media for post', i + 1, error)
                toast.error(`Failed to upload media for post ${i + 1}`)
                mediaUrlsPerPost.push('') // Add empty string to maintain array indices
              }
            } else {
              mediaUrlsPerPost.push('') // No media for this post
            }
          }
        }
        
        let response
        let data
        let usedNumberedFallback = false
        
        // Try the real thread endpoint first (currently limited by Meta permissions)
        console.log(`Attempting to create connected thread with ${filteredPosts.length} posts`)
        toast.info('Creating thread...')
        
        response = await fetch('/api/post/threads/thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: threadsAccount.platform_user_id,
            accessToken: threadsAccount.access_token,
            posts: filteredPosts,
            mediaUrls: mediaUrlsPerPost.length > 0 ? mediaUrlsPerPost : []
          })
        })
        
        data = await response.json()
        
        // If the thread endpoint fails with a permission error, fall back to numbered
        // Note: Meta currently restricts reply_to_id to approved apps only
        if (!response.ok && data.error && 
            (data.error.includes('permission') || 
             data.error.includes('reply_to_id'))) {
          console.log('Connected threads not available - Meta permission required')
          toast.info('Creating numbered thread series (Meta limitation)')
          
          response = await fetch('/api/post/threads/thread-numbered', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: threadsAccount.platform_user_id,
              accessToken: threadsAccount.access_token,
              posts: filteredPosts,
              mediaUrls: mediaUrlsPerPost.length > 0 ? mediaUrlsPerPost : [],
              addNumbers: true
            })
          })
          
          data = await response.json()
          usedNumberedFallback = true
        }
        
        if (!response.ok) {
          toast.error(data.error || 'Failed to post thread')
          progressTracker.updatePlatform('threads', 'error', undefined, data.error || 'Failed to post thread')
        } else if (data.partial) {
          toast.warning(data.message)
          progressTracker.updatePlatform('threads', 'success', `Partial: ${data.message}`)
        } else {
          const successMessage = usedNumberedFallback 
            ? `Thread posted as ${data.posts.length} numbered posts`
            : `Connected thread created with ${data.posts.length} posts!`
          toast.success(successMessage)
          
          // Update progress tracker to show Threads succeeded
          progressTracker.updatePlatform('threads', 'success', successMessage)
          
          // Save thread to database
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user && data.posts) {
              const postedTime = new Date().toISOString()
              
              // Build post_results array with all thread posts
              const postResults = data.posts.map((post: any, index: number) => ({
                platform: 'threads',
                success: true,
                postId: post.postId,
                containerId: post.containerId,
                isThread: true,
                isReply: post.isReply,
                threadIndex: index,
                threadTotal: data.posts.length,
                isConnectedThread: data.isConnectedThread,
                usedNumberedFallback: usedNumberedFallback
              }))
              
              // Use first post content for main content field
              const mainContent = filteredPosts[0] || threadPosts[0]
              
              await supabase
                .from('scheduled_posts')
                .insert({
                  user_id: user.id,
                  content: mainContent,
                  platforms: ['threads'],
                  platform_content: { 
                    threads: `Thread: ${filteredPosts.join(' | ')}` // Store all posts
                  },
                  media_urls: mediaUrlsPerPost.filter(url => url), // Filter out empty strings
                  status: 'posted',
                  scheduled_for: postedTime,
                  posted_at: postedTime,
                  post_results: postResults
                })
            }
          } catch (error) {
            console.error('Failed to save Threads thread to database:', error)
          }
          
          // Clear form
          setPostContent('')
          setThreadPosts([''])
          setThreadsThreadMedia([])
          setThreadsMode('single')
          setSelectedPlatforms([])
        }
        
        progressTracker.finish()
        clearTimeout(timeoutId)
        setIsPosting(false)
        return
      }

      // Handle Twitter thread mode separately
      if (supportedPlatforms.length === 1 && supportedPlatforms[0] === 'twitter' && twitterMode === 'thread' && twitterThreadPosts.length > 0) {
        // Get Twitter account
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          progressTracker.updatePlatform('twitter', 'error', undefined, 'User not authenticated')
          progressTracker.finish()
          clearTimeout(timeoutId)
          setIsPosting(false)
          return
        }

        const { data: twitterAccount } = await supabase
          .from('social_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('platform', 'twitter')
          .eq('is_active', true)
          .single()

        if (!twitterAccount) {
          progressTracker.updatePlatform('twitter', 'error', undefined, 'Twitter account not connected')
          progressTracker.finish()
          clearTimeout(timeoutId)
          setIsPosting(false)
          return
        }

        console.log(`Posting thread for @${twitterAccount.username}`)
        
        // Filter out empty tweets BUT keep track of original indices for media
        const filteredData: { text: string; originalIndex: number }[] = []
        twitterThreadPosts.forEach((post, index) => {
          if (post.trim().length > 0) {
            filteredData.push({ text: post, originalIndex: index })
          }
        })
        
        const filteredTweets = filteredData.map(d => d.text)
        
        // Upload media for each tweet that has it
        const mediaUrlsPerTweet: string[][] = []
        if (twitterThreadMedia.some(m => m && m.length > 0)) {
          toast.info('Uploading media for thread...')
        }
        
        for (let i = 0; i < filteredData.length; i++) {
          const originalIndex = filteredData[i].originalIndex
          const mediaFiles = twitterThreadMedia[originalIndex]
          if (mediaFiles && mediaFiles.length > 0) {
            const urls: string[] = []
            for (const file of mediaFiles) {
              try {
                // Generate unique filename
                const timestamp = Date.now()
                const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
                const filename = `twitter-thread/${user.id}/${timestamp}-${sanitizedName}`
                
                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('post-media')
                  .upload(filename, file, {
                    contentType: file.type,
                    upsert: false
                  })
                
                if (uploadError) throw uploadError
                
                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                  .from('post-media')
                  .getPublicUrl(filename)
                
                urls.push(publicUrl)
              } catch (error) {
                console.error('Error uploading media for tweet', i + 1, error)
                toast.error(`Failed to upload media for tweet ${i + 1}`)
              }
            }
            mediaUrlsPerTweet.push(urls)
          } else {
            mediaUrlsPerTweet.push([])
          }
        }
        
        toast.info('Creating Twitter thread...')
        
        const response = await fetch('/api/post/twitter/thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tweets: filteredTweets,
            mediaUrls: mediaUrlsPerTweet,
            accessToken: twitterAccount.access_token,
            accessSecret: twitterAccount.access_secret,
            userId: user.id,
            addNumbers: true // Add [1/n] numbering
          })
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          toast.error(data.error || 'Failed to post Twitter thread')
          progressTracker.updatePlatform('twitter', 'error', undefined, data.error || 'Failed to post thread')
        } else {
          const successMessage = `Twitter thread created with ${data.data.tweetCount} tweets!`
          toast.success(successMessage)
          
          // Update progress tracker to show Twitter succeeded
          progressTracker.updatePlatform('twitter', 'success', successMessage)
          
          // Save thread to database
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user && data.data) {
              const postedTime = new Date().toISOString()
              
              // Build post_results array with all thread tweets
              const postResults = data.data.ids.map((id: string, index: number) => ({
                platform: 'twitter',
                success: true,
                postId: id,
                url: data.data.urls[index],
                isThread: true,
                threadIndex: index,
                threadTotal: data.data.tweetCount
              }))
              
              // Use first tweet content for main content field
              const mainContent = filteredTweets[0] || twitterThreadPosts[0]
              
              await supabase
                .from('scheduled_posts')
                .insert({
                  user_id: user.id,
                  content: mainContent,
                  platforms: ['twitter'],
                  platform_content: { 
                    twitter: `Thread: ${filteredTweets.join(' | ')}` // Store all tweets
                  },
                  media_urls: mediaUrlsPerTweet.flat(), // Flatten array of arrays
                  status: 'posted',
                  scheduled_for: postedTime,
                  posted_at: postedTime,
                  post_results: postResults
                })
            }
          } catch (error) {
            console.error('Failed to save Twitter thread to database:', error)
          }
          
          // Clear form
          setPostContent('')
          setTwitterThreadPosts([''])
          setTwitterThreadMedia([])
          setTwitterMode('single')
          setSelectedPlatforms([])
        }
        
        progressTracker.finish()
        clearTimeout(timeoutId)
        setIsPosting(false)
        return
      }

      // If we're in threads mode with thread posts, we've already handled it above
      // This prevents duplicate posting
      if (selectedPlatforms.length === 1 && selectedPlatforms[0] === 'threads' && threadsMode === 'thread') {
        clearTimeout(timeoutId)
        setIsPosting(false)
        return
      }

      // If we're in twitter thread mode, we've already handled it above
      if (selectedPlatforms.length === 1 && selectedPlatforms[0] === 'twitter' && twitterMode === 'thread') {
        clearTimeout(timeoutId)
        setIsPosting(false)
        return
      }

      const postData: PostData = {
        content: postContent,
        platforms: supportedPlatforms,
        platformContent: Object.keys(filteredPlatformContent).length > 0 ? filteredPlatformContent : undefined,
        mediaUrls: mediaUrls,
        selectedAccounts: selectedAccounts,
        pinterestBoardId: selectedPinterestBoard,
        pinterestTitle: pinterestTitle || undefined,
        pinterestDescription: pinterestDescription || undefined,
        pinterestLink: pinterestLink || undefined,
        // TikTok settings - Updated for audit compliance
        tiktokTitle: selectedPlatforms.includes('tiktok') ? tiktokTitle : undefined,
        tiktokPrivacyLevel: selectedPlatforms.includes('tiktok') ? tiktokPrivacyLevel : undefined,
        tiktokAllowComment: selectedPlatforms.includes('tiktok') ? tiktokAllowComment : undefined,
        tiktokAllowDuet: selectedPlatforms.includes('tiktok') ? tiktokAllowDuet : undefined,
        tiktokAllowStitch: selectedPlatforms.includes('tiktok') ? tiktokAllowStitch : undefined,
        tiktokBrandContentToggle: selectedPlatforms.includes('tiktok') ? tiktokBrandedContent : undefined,
        tiktokBrandOrganicToggle: selectedPlatforms.includes('tiktok') ? tiktokPromotionalContent : undefined,
        tiktokPhotoCoverIndex: selectedPlatforms.includes('tiktok') ? tiktokPhotoCoverIndex : undefined,
        instagramAsStory: selectedPlatforms.includes('instagram') ? instagramAsStory : undefined,
        instagramAsReel: selectedPlatforms.includes('instagram') ? instagramAsReel : undefined,
        facebookAsStory: selectedPlatforms.includes('facebook') ? facebookAsStory : undefined,
        facebookAsReel: selectedPlatforms.includes('facebook') ? facebookAsReel : undefined,
        youtubeAsShort: selectedPlatforms.includes('youtube') ? youtubeAsShort : undefined,
        // Phase 1 Quick Wins - New platform-specific settings
        linkedinVisibility: selectedPlatforms.includes('linkedin') ? linkedinVisibility : undefined,
        youtubeMadeForKids: selectedPlatforms.includes('youtube') ? (youtubeMadeForKids ?? undefined) : undefined,
        youtubeEmbeddable: selectedPlatforms.includes('youtube') ? youtubeEmbeddable : undefined,
        youtubeLicense: selectedPlatforms.includes('youtube') ? youtubeLicense : undefined,
        threadsReplyControl: selectedPlatforms.includes('threads') ? threadsReplyControl : undefined,
        instagramAltText: selectedPlatforms.includes('instagram') ? instagramAltText : undefined,
        pinterestAltText: selectedPlatforms.includes('pinterest') ? pinterestAltText : undefined,
        blueskyAltText: selectedPlatforms.includes('bluesky') ? blueskyAltText : undefined,
        // Phase 2A Instagram Quick Wins
        instagramLocation: selectedPlatforms.includes('instagram') ? (instagramLocation ?? undefined) : undefined,
        instagramDisableComments: selectedPlatforms.includes('instagram') ? instagramDisableComments : undefined,
        // Phase 3 Community Controls
        blueskyReplyControl: selectedPlatforms.includes('bluesky') ? blueskyReplyControl : undefined,
        facebookPublishAsDraft: selectedPlatforms.includes('facebook') ? facebookPublishAsDraft : undefined,
      }

      console.log('Posting with data:', {
        platforms: postData.platforms,
        hasContent: !!postData.content,
        mediaUrls: postData.mediaUrls,
        mediaUrlsCount: postData.mediaUrls?.length,
        selectedAccounts: postData.selectedAccounts
      })

      const results = await postingService.postToMultiplePlatforms(
        postData,
        instagramProgressToast ? (platform, status) => {
          if (platform === 'instagram' && instagramProgressToast) {
            // Update the existing toast with new status
            toast.loading(status, { id: instagramProgressToast });
          }
        } : undefined,
        progressTracker
      )
      
      // Dismiss the Instagram-specific toast if it exists
      if (instagramProgressToast) {
        toast.dismiss(instagramProgressToast);
      }
      
      // The progress tracker will show final results
      progressTracker.finish();
      
      // Process results
      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)
      
      // Store successful posts in database for tracking and analytics
      if (successful.length > 0 || failed.length > 0) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const postedTime = new Date().toISOString()
            
            // Convert results to post_results format
            const postResults = results.map(r => ({
              platform: r.platform,
              success: r.success,
              postId: r.postId || null,
              error: r.error || null,
              data: r.data || null // Include the data object which contains type, thumbnailUrl, metrics, etc.
            }))

            // Extract thumbnail URL from results if available (for videos/reels/stories)
            let platformMediaUrl = null;
            console.log('=== THUMBNAIL EXTRACTION DEBUG ===');
            console.log('Results array:', JSON.stringify(results, null, 2));
            for (const result of results) {
              console.log(`Checking result for ${result.platform}:`, {
                hasData: !!result.data,
                dataKeys: result.data ? Object.keys(result.data) : [],
                hasThumbnailUrl: !!(result.data as any)?.thumbnailUrl,
                thumbnailValue: (result.data as any)?.thumbnailUrl
              });
              // Check if result has data property and thumbnailUrl
              if (result.data && (result.data as any).thumbnailUrl) {
                platformMediaUrl = (result.data as any).thumbnailUrl;
                console.log(`Found thumbnail URL for ${result.platform}:`, platformMediaUrl);
                break; // Use first thumbnail found
              }
            }
            console.log('Final platformMediaUrl:', platformMediaUrl);

            // Build platform_content with Pinterest data if needed
            const enrichedPlatformContent = { ...platformContent }
            if (supportedPlatforms.includes('pinterest') && (pinterestTitle || pinterestDescription)) {
              // Store Pinterest title (and optionally description) in platform_content
              // Format: "title: description" for parsing, but dashboard will only show title
              const pinterestContent = []
              if (pinterestTitle) pinterestContent.push(pinterestTitle)
              if (!pinterestTitle && pinterestDescription) {
                // Only use description if there's no title
                pinterestContent.push(pinterestDescription)
              } else if (pinterestTitle && pinterestDescription) {
                // Store both but separated by colon for parsing
                enrichedPlatformContent.pinterest = `${pinterestTitle}: ${pinterestDescription}`
              } else {
                enrichedPlatformContent.pinterest = pinterestContent.join('')
              }
            }

            // Build the insert data object
            const insertData: any = {
              user_id: user.id,
              content: postContent,
              platforms: supportedPlatforms,
              platform_content: Object.keys(enrichedPlatformContent).length > 0 ? enrichedPlatformContent : {},
              media_urls: mediaUrls.length > 0 ? mediaUrls : [],
              status: successful.length > 0 && failed.length === 0 ? 'posted' :
                      successful.length > 0 && failed.length > 0 ? 'partial' : 'failed',
              scheduled_for: postedTime, // Set this so posts appear in queries that order by scheduled_for
              posted_at: postedTime,
              post_results: postResults
            };

            // Add platform_media_url if thumbnail was found
            if (platformMediaUrl) {
              insertData.platform_media_url = platformMediaUrl;
              console.log('💾 Adding platform_media_url to insert data:', platformMediaUrl);
            } else {
              console.log('⚠️ No platform_media_url to add');
            }

            console.log('💾 Final insertData before database insert:', JSON.stringify(insertData, null, 2));

            // Store in scheduled_posts table
            const { data: insertedData, error: insertError } = await supabase
              .from('scheduled_posts')
              .insert(insertData)
              .select();

            if (insertError) {
              console.error('❌ Database insert error:', insertError);
            } else {
              console.log('✅ Database insert successful:', insertedData);
            }
          }
        } catch (error) {
          console.error('Failed to store post results in database:', error)
        }
      }
      
      // Check if we had any successful posts
      if (successful.length > 0) {
        // TikTok sandbox responses are marked as failed with a sandbox message
        // We don't show the old misleading success message
      }
      
      // Check if TikTok failed due to sandbox mode
      const tiktokResult = results.find(r => r.platform === 'tiktok' || r.platform.startsWith('tiktok'))
      if (tiktokResult && !tiktokResult.success && tiktokResult.error?.includes('sandbox')) {
        toast.info(
          '📱 TikTok Sandbox Mode: API test successful. Actual posting requires app approval from TikTok.', 
          {
            duration: 10000 // Show for 10 seconds
          }
        )
      }

      // Progress tracker already shows individual errors, so we don't duplicate them here

      // Clear form if all successful
      if (failed.length === 0) {
        // Clean up uploaded images from storage
        // IMPORTANT: Don't cleanup if TikTok or Pinterest was posted
        // - TikTok needs time to download the video via PULL_FROM_URL
        // - Pinterest needs permanent URLs for thumbnails (Pinterest API URLs expire)
        const postedToTikTok = supportedPlatforms.includes('tiktok');
        const postedToPinterest = supportedPlatforms.includes('pinterest');
        const shouldSkipCleanup = postedToTikTok || postedToPinterest;

        if (mediaUrls.length > 0 && !shouldSkipCleanup) {
          try {
            await fetch('/api/upload/cleanup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ urls: mediaUrls }),
            })
          } catch (error) {
            console.error('Failed to cleanup uploaded files:', error)
          }
        } else if (shouldSkipCleanup) {
          const reason = postedToTikTok ? 'TikTok needs time to download' : 'Pinterest needs permanent URLs';
          console.log(`Skipping media cleanup - ${reason}`);
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
        setUploadedMediaTypes([])
        setCurrentDraftId(null)
      }

    } catch (error) {
      console.error('Posting error:', error)
      progressTracker.finish(); // Make sure to finish the tracker on error
      toast.error('Failed to post: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      // Clear timeout and always reset posting state
      clearTimeout(timeoutId)
      setIsPosting(false)
    }
  }, [selectedPlatforms, postContent, platformContent, selectedFiles, uploadedMediaUrls, currentDraftId,
      youtubeVideoFile, youtubeTitle, youtubeDescription, youtubeTags, youtubeCategoryId, youtubePrivacyStatus, youtubeThumbnailFile,
      twitterMode, twitterThreadPosts, twitterThreadMedia,
      selectedPinterestBoard, pinterestTitle, pinterestDescription, pinterestLink,
      tiktokTitle, tiktokPrivacyLevel, tiktokAllowComment, tiktokAllowDuet, tiktokAllowStitch,
      tiktokContentDisclosure, tiktokPromotionalContent, tiktokBrandedContent, tiktokPhotoCoverIndex,
      instagramAsStory, threadPosts, threadsMode, threadsThreadMedia,
      supabase, selectedAccounts, uploadFiles])

  const handleSchedulePost = async () => {
    if (!scheduledDate || !scheduledTime) {
      toast.error('Please select both date and time')
      return
    }

    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform')
      return
    }

    // Special handling for Threads thread mode
    const isThreadsThreadMode = selectedPlatforms.length === 1 && 
      selectedPlatforms[0] === 'threads' && 
      threadsMode === 'thread'
    
    // Special handling for Twitter thread mode
    const isTwitterThreadMode = selectedPlatforms.length === 1 && 
      selectedPlatforms[0] === 'twitter' && 
      twitterMode === 'thread'
    
    if (isThreadsThreadMode) {
      // For Threads thread mode, check threadPosts instead of main content
      const hasThreadContent = threadPosts.some(p => p.trim().length > 0)
      if (!hasThreadContent) {
        toast.error('Please add content to at least one thread post')
        return
      }
      // If we have thread content, skip all other content validation
      // and proceed directly with scheduling logic
    } else if (isTwitterThreadMode) {
      // For Twitter thread mode, check twitterThreadPosts instead of main content
      const hasTwitterThreadContent = twitterThreadPosts.some(p => p && typeof p === 'string' && p.trim().length > 0)
      if (!hasTwitterThreadContent) {
        toast.error('Please add content to at least one tweet in your thread')
        return
      }
      // If we have thread content, skip all other content validation
      // and proceed directly with scheduling logic
    } else {

    // Check if we have content either in main area or platform-specific
    const hasMainContent = postContent.trim().length > 0
    const hasPlatformContent = selectedPlatforms.some(platform => 
      platformContent[platform]?.trim().length > 0
    )
    
    // Special handling for YouTube - video is the content
    const hasYouTubeContent = selectedPlatforms.includes('youtube') && 
      youtubeVideoFile !== null && 
      youtubeTitle && youtubeTitle.trim().length > 0
    
    // Special handling for Instagram Stories - no caption required
    const isInstagramStoryOnly = selectedPlatforms.length === 1 && 
      selectedPlatforms[0] === 'instagram' && 
      instagramAsStory && 
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)
    
    // Check if Instagram Story is selected (even with other platforms)
    const hasInstagramStory = selectedPlatforms.includes('instagram') &&
      instagramAsStory &&
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)

    // Special handling for Facebook Stories - no caption required
    const isFacebookStoryOnly = selectedPlatforms.length === 1 &&
      selectedPlatforms[0] === 'facebook' &&
      facebookAsStory &&
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)

    // Special handling for Facebook Reels - caption optional
    const isFacebookReelOnly = selectedPlatforms.length === 1 &&
      selectedPlatforms[0] === 'facebook' &&
      facebookAsReel &&
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)

    // Check if Facebook Story or Reel is selected (even with other platforms)
    const hasFacebookStory = selectedPlatforms.includes('facebook') &&
      facebookAsStory &&
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)

    const hasFacebookReel = selectedPlatforms.includes('facebook') &&
      facebookAsReel &&
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)

    // Special handling for Facebook feed posts - caption optional with media
    const isFacebookFeedOnly = selectedPlatforms.length === 1 &&
      selectedPlatforms[0] === 'facebook' &&
      !facebookAsStory &&
      !facebookAsReel &&
      (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)

    // Debug logging for Instagram Story
    console.log('Instagram Story Debug:', {
      selectedPlatforms,
      instagramAsStory,
      selectedFilesCount: selectedFiles.length,
      uploadedMediaUrlsCount: uploadedMediaUrls.length,
      isInstagramStoryOnly,
      hasInstagramStory
    })
    
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
                          uploadedMediaUrls.some(media => {
                            const url = getMediaUrl(media)
                            return url.includes('.mp4') || url.includes('.mov') || url.includes('.avi')
                          })
    
    // Special handling for TikTok - requires video
    const hasTikTokContent = selectedPlatforms.includes('tiktok') && hasVideoFiles
    
    // Check content requirements - special handling for platform-specific content
    const isYouTubeOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'youtube'
    const isPinterestOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'pinterest'
    const isTikTokOnly = selectedPlatforms.length === 1 && selectedPlatforms[0] === 'tiktok'
    
    // Content validation with platform-specific rules
    console.log('Validation check - isInstagramStoryOnly:', isInstagramStoryOnly)
    
    if (isInstagramStoryOnly) {
      console.log('Instagram Story Only path')
      // Instagram Stories only need media, not captions
      if (selectedFiles.length === 0 && uploadedMediaUrls.length === 0) {
        toast.error('Please select an image or video for your story')
        return
      }
      console.log('Instagram Story validation passed')
      // Instagram Story validation passed - skip all other content checks
    } else if (isFacebookStoryOnly) {
      console.log('Facebook Story Only path')
      // Facebook Stories only need media, not captions
      if (selectedFiles.length === 0 && uploadedMediaUrls.length === 0) {
        toast.error('Please select an image or video for your Facebook story')
        return
      }
      console.log('Facebook Story validation passed')
      // Facebook Story validation passed - skip all other content checks
    } else if (isFacebookReelOnly) {
      console.log('Facebook Reel Only path')
      // Facebook Reels only need video, caption is optional
      if (selectedFiles.length === 0 && uploadedMediaUrls.length === 0) {
        toast.error('Please select a video for your Facebook reel')
        return
      }
      console.log('Facebook Reel validation passed')
      // Facebook Reel validation passed - skip all other content checks
    } else if (isFacebookFeedOnly) {
      console.log('Facebook Feed Only path')
      // Facebook feed posts with media don't require captions
      if (selectedFiles.length === 0 && uploadedMediaUrls.length === 0) {
        toast.error('Please select an image or video for your Facebook post')
        return
      }
      console.log('Facebook Feed validation passed')
      // Facebook Feed validation passed - skip all other content checks
    } else if (isYouTubeOnly) {
      // YouTube-only posts need video and title
      if (!youtubeVideoFile) {
        console.log('YouTube-only: no video file detected')
        toast.error('YouTube requires a video file')
        return
      }
      if (!youtubeTitle || !youtubeTitle.trim()) {
        toast.error('YouTube requires a video title')
        return
      }
      // YouTube validation passed
    } else if (isPinterestOnly && hasPinterestContent) {
      // Pinterest has its content (board + image) - validation passed
    } else if (isTikTokOnly && hasTikTokContent) {
      // TikTok has its content (video) - validation passed
    } else if (hasInstagramStory && selectedPlatforms.length > 1) {
      // Mixed platforms including Instagram Story
      const otherPlatforms = selectedPlatforms.filter(p => p !== 'instagram')
      // Instagram Story only needs media (already checked in hasInstagramStory)
      // Check if other platforms have content
      const otherPlatformsHaveContent = hasMainContent || hasPlatformContent ||
        otherPlatforms.some(p => p === 'pinterest' && hasPinterestContent) ||
        otherPlatforms.some(p => p === 'youtube' && hasYouTubeContent) ||
        otherPlatforms.some(p => p === 'tiktok' && hasTikTokContent) ||
        otherPlatforms.some(p => p === 'facebook' && hasFacebookStory) ||
        otherPlatforms.some(p => p === 'facebook' && hasFacebookReel)

      if (!otherPlatformsHaveContent) {
        toast.error('Please enter content for non-Instagram platforms')
        return
      }
    } else if (hasFacebookStory && selectedPlatforms.length > 1) {
      // Mixed platforms including Facebook Story
      const otherPlatforms = selectedPlatforms.filter(p => p !== 'facebook')
      // Facebook Story only needs media (already checked in hasFacebookStory)
      // Check if other platforms have content
      const otherPlatformsHaveContent = hasMainContent || hasPlatformContent ||
        otherPlatforms.some(p => p === 'pinterest' && hasPinterestContent) ||
        otherPlatforms.some(p => p === 'youtube' && hasYouTubeContent) ||
        otherPlatforms.some(p => p === 'tiktok' && hasTikTokContent) ||
        otherPlatforms.some(p => p === 'instagram' && hasInstagramStory)

      if (!otherPlatformsHaveContent) {
        toast.error('Please enter content for non-Facebook platforms')
        return
      }
    } else if (hasFacebookReel && selectedPlatforms.length > 1) {
      // Mixed platforms including Facebook Reel
      const otherPlatforms = selectedPlatforms.filter(p => p !== 'facebook')
      // Facebook Reel only needs video (already checked in hasFacebookReel)
      // Check if other platforms have content
      const otherPlatformsHaveContent = hasMainContent || hasPlatformContent ||
        otherPlatforms.some(p => p === 'pinterest' && hasPinterestContent) ||
        otherPlatforms.some(p => p === 'youtube' && hasYouTubeContent) ||
        otherPlatforms.some(p => p === 'tiktok' && hasTikTokContent) ||
        otherPlatforms.some(p => p === 'instagram' && hasInstagramStory)

      if (!otherPlatformsHaveContent) {
        toast.error('Please enter content for non-Facebook platforms')
        return
      }
    } else if (!hasMainContent && !hasPlatformContent && !hasYouTubeContent && !hasPinterestContent && !hasTikTokContent && !isThreadsThreadMode && !isTwitterThreadMode && !isFacebookStoryOnly && !isFacebookReelOnly && !isFacebookFeedOnly && !isInstagramStoryOnly) {
      // No content at all for regular posts (skip this check for Threads thread mode, Twitter thread mode, Facebook Stories/Reels/Feed, Instagram Stories)
      console.log('No content validation path - failing')
      console.log('Validation state:', {
        hasMainContent,
        hasPlatformContent,
        hasYouTubeContent,
        hasPinterestContent,
        hasTikTokContent,
        hasInstagramStory,
        isInstagramStoryOnly,
        isFacebookStoryOnly,
        isFacebookReelOnly,
        isFacebookFeedOnly,
        isThreadsThreadMode,
        isTwitterThreadMode
      })
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
    
    // TikTok-specific validation - Updated for TikTok audit compliance
    if (selectedPlatforms.includes('tiktok')) {
      const hasImageFiles = selectedFiles.some(f => f.type.startsWith('image/')) || uploadedMediaUrls.some(media => getMediaUrl(media).match(/\.(jpg|jpeg|png|gif|webp)$/i))
      const hasVideoFiles = selectedFiles.some(f => f.type.startsWith('video/')) || uploadedMediaUrls.some(media => getMediaUrl(media).match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i))

      // TikTok requires either video or photo
      if (!hasVideoFiles && !hasImageFiles) {
        toast.error('TikTok requires at least one video or photo')
        return
      }

      // Privacy level is REQUIRED (no default allowed)
      if (!tiktokPrivacyLevel) {
        toast.error('Please select a privacy level for TikTok')
        return
      }

      // Commercial content disclosure validation
      if (tiktokContentDisclosure && !tiktokPromotionalContent && !tiktokBrandedContent) {
        toast.error('TikTok: Please select at least one commercial content option or disable content disclosure')
        return
      }

      // Branded content cannot be private
      if (tiktokBrandedContent && tiktokPrivacyLevel === 'SELF_ONLY') {
        toast.error('TikTok: Branded content cannot be posted with private visibility. Please select Public or Friends.')
        return
      }
    }

    } // End of if block for regular content validation (not thread mode)

    setIsPosting(true)

    try {
      // Upload files first if any
      let mediaUrls: string[] = [...uploadedMediaUrls]  // Start with already uploaded URLs
      if (selectedFiles.length > 0) {
        toast.info('Uploading media...')
        const newMediaUrls = await uploadFiles()
        if (newMediaUrls.length === 0 && selectedFiles.length > 0) {
          toast.error('Failed to upload media files')
          return
        }
        mediaUrls = [...mediaUrls, ...newMediaUrls]  // Combine old and new
      }

      // Upload thread media if in thread mode
      let threadsThreadMediaUrls: string[][] = []
      if (isThreadsThreadMode && threadsThreadMedia.length > 0) {
        const hasAnyMedia = threadsThreadMedia.some(files => files && files.length > 0)
        if (hasAnyMedia) {
          toast.info('Uploading thread media...')
        }
        for (const mediaFiles of threadsThreadMedia) {
          if (mediaFiles && mediaFiles.length > 0) {
            const urls = await uploadFilesImmediately(mediaFiles)
            if (urls && urls.length > 0) {
              threadsThreadMediaUrls.push(urls)
            } else {
              threadsThreadMediaUrls.push([])
            }
          } else {
            threadsThreadMediaUrls.push([])
          }
        }
      }

      // Combine date and time
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`)
      
      // Handle YouTube scheduling separately
      if (selectedPlatforms.includes('youtube') && youtubeVideoFile) {
        // For YouTube scheduling, upload the video immediately as private with publishAt
        toast.info('Scheduling YouTube video...')

        // First, handle thumbnail (prioritize custom, otherwise extract from video)
        let youtubeThumbnailUrl: string | undefined;
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error('User not authenticated')

          if (youtubeThumbnailFile) {
            // Upload custom thumbnail to Supabase Storage
            const fileName = `${user.id}/${Date.now()}_youtube_scheduled_custom_thumb.jpg`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('post-media')
              .upload(fileName, youtubeThumbnailFile, {
                contentType: youtubeThumbnailFile.type,
                upsert: false
              })

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('post-media')
                .getPublicUrl(fileName)

              youtubeThumbnailUrl = publicUrl
              console.log('Custom YouTube thumbnail uploaded for scheduled post:', youtubeThumbnailUrl)
            } else {
              console.error('Failed to upload custom thumbnail for scheduled post:', uploadError)
            }
          } else {
            // Auto-extract thumbnail from video
            const { extractVideoThumbnail, blobToFile } = await import('@/lib/video-thumbnail')
            const thumbnailBlob = await extractVideoThumbnail(youtubeVideoFile, {
              width: 1280,
              height: 720,
              quality: 0.85
            })

            if (thumbnailBlob) {
              const thumbnailFile = blobToFile(thumbnailBlob, `youtube_scheduled_thumbnail_${Date.now()}.jpg`)
              const fileName = `${user.id}/${Date.now()}_youtube_scheduled_thumb.jpg`

              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('post-media')
                .upload(fileName, thumbnailFile, {
                  contentType: 'image/jpeg',
                  upsert: false
                })

              if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                  .from('post-media')
                  .getPublicUrl(fileName)

                youtubeThumbnailUrl = publicUrl
                console.log('Auto-extracted YouTube thumbnail uploaded for scheduled post:', youtubeThumbnailUrl)
              } else {
                console.error('Failed to upload auto-extracted thumbnail for scheduled post:', uploadError)
              }
            }
          }
        } catch (thumbnailError) {
          console.error('Error processing thumbnail for scheduled YouTube video:', thumbnailError)
          // Continue without thumbnail
        }

        const formData = new FormData()
        formData.append('video', youtubeVideoFile)
        if (youtubeThumbnailFile) {
          formData.append('thumbnail', youtubeThumbnailFile)
        }
        formData.append('title', youtubeTitle || 'New Video')
        formData.append('description', youtubeDescription || postContent)
        formData.append('tags', youtubeTags.join(','))
        formData.append('categoryId', youtubeCategoryId)
        formData.append('privacyStatus', 'private') // Must be private for scheduling
        formData.append('publishAt', scheduledFor.toISOString()) // Set publish time

        try {
          const response = await fetch('/api/media/upload/youtube', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'YouTube scheduling failed')
          }

          const result = await response.json()

          // Store the scheduled YouTube video in scheduled_posts
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase
              .from('scheduled_posts')
              .insert({
                user_id: user.id,
                content: youtubeDescription || postContent,
                platforms: ['youtube'],
                platform_content: { youtube: youtubeDescription || postContent },
                media_urls: youtubeThumbnailUrl ? [youtubeThumbnailUrl] : null,
                platform_media_url: youtubeThumbnailUrl,
                status: 'pending', // Use pending so it shows in scheduled posts
                scheduled_for: scheduledFor.toISOString(),
                post_results: [{
                  platform: 'youtube',
                  scheduled: true,
                  videoId: result.video.id,
                  url: result.video.url,
                  publishAt: scheduledFor.toISOString()
                }]
              })
          }
          
          toast.success(`YouTube video scheduled for ${scheduledFor.toLocaleString()}`)
          
          // Remove YouTube from platforms to schedule normally
          const nonYouTubePlatforms = selectedPlatforms.filter(p => p !== 'youtube')
          
          // If YouTube was the only platform, we're done
          if (nonYouTubePlatforms.length === 0) {
            // Clear form
            setPostContent('')
            setPlatformContent({})
            setSelectedPlatforms([])
            setSelectedFiles([])
            setUploadedMediaUrls([])
            setUploadedMediaTypes([])
            setScheduledDate('')
            setScheduledTime('')
            setYoutubeVideoFile(null)
            setYoutubeThumbnailFile(null)
            setYoutubeTitle('')
            setYoutubeDescription('')
            setYoutubeTags([])
            setIsPosting(false)
            return
          }
          
          // Continue with other platforms (update selected platforms)
          selectedPlatforms.splice(selectedPlatforms.indexOf('youtube'), 1)
        } catch (error) {
          console.error('YouTube scheduling error:', error)
          toast.error(`Failed to schedule YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`)
          setIsPosting(false)
          return
        }
      }
      
      // Only include platform-specific content if it's actually different from main content
      const filteredPlatformContent: Record<string, string> = {}
      Object.entries(platformContent).forEach(([platform, content]) => {
        // Only include if it's different from main content and not empty
        if (content && content.trim() !== postContent.trim()) {
          filteredPlatformContent[platform] = content
        }
      })
      
      const requestData = {
        content: isThreadsThreadMode ? (threadPosts.filter(p => p.trim()).length > 0 ? threadPosts[0] : '') : postContent,
        platforms: selectedPlatforms,
        platformContent: Object.keys(filteredPlatformContent).length > 0 ? filteredPlatformContent : undefined,
        mediaUrls: mediaUrls,
        scheduledFor: scheduledFor.toISOString(),
        selectedAccounts: selectedAccounts,
        pinterestBoardId: selectedPinterestBoard || undefined,
        pinterestTitle: pinterestTitle || undefined,
        pinterestDescription: pinterestDescription || undefined,
        pinterestLink: pinterestLink || undefined,
        // Include format flags for scheduled posts
        instagramAsStory: instagramAsStory,
        instagramAsReel: instagramAsReel,
        facebookAsStory: facebookAsStory,
        facebookAsReel: facebookAsReel,
        youtubeAsShort: youtubeAsShort,
        // Include thread-specific data
        ...(isThreadsThreadMode && {
          threadsMode: 'thread',
          threadPosts: threadPosts.filter(p => p.trim().length > 0),
          threadsThreadMedia: threadsThreadMediaUrls
        }),
      }
      
      console.log('Sending schedule request:', requestData)
      
      // Update existing scheduled post or create new one
      let response
      const scheduledPostId = searchParams.get('scheduledPostId')

      if (editingScheduledPost && scheduledPostId) {
        // Update existing scheduled post using new API endpoint
        response = await fetch(`/api/posts/scheduled/${scheduledPostId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: requestData.content,
            platforms: requestData.platforms,
            platform_content: requestData.platformContent,
            media_urls: requestData.mediaUrls,
            scheduled_for: requestData.scheduledFor,
            // Include format flags
            instagram_as_story: requestData.instagramAsStory,
            instagram_as_reel: requestData.instagramAsReel,
            facebook_as_story: requestData.facebookAsStory,
            facebook_as_reel: requestData.facebookAsReel,
            youtube_as_short: requestData.youtubeAsShort
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

      // If editing scheduled post, redirect to scheduled posts page
      if (editingScheduledPost) {
        router.push('/dashboard/posts/scheduled')
        return
      }

      // Clear form
      setPostContent('')
      setPlatformContent({})
      setSelectedPlatforms([])
      setSelectedFiles([])
      setUploadedMediaUrls([])
      setUploadedMediaTypes([])
      setScheduledDate('')
      setScheduledTime('')
      setCurrentDraftId(null)
      setEditingScheduledPost(false)

    } catch (error) {
      console.error('Scheduling error:', error)
      // Show the actual error message if available
      const errorMessage = error instanceof Error ? error.message : 'Failed to schedule post'
      toast.error(errorMessage)
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
        title: title || (selectedPlatforms.includes('pinterest') && pinterestTitle ? pinterestTitle : 'Untitled Draft'),
        content: postContent,
        platforms: selectedPlatforms,
        platformContent: Object.keys(filteredPlatformContent).length > 0 ? filteredPlatformContent : undefined,
        mediaUrls: mediaUrls,
        pinterest_title: pinterestTitle || undefined,
        pinterest_description: pinterestDescription || undefined,
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
      setUploadedMediaTypes([])
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

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)

    // Check Instagram carousel limit (including already selected files)
    const totalFiles = selectedFiles.length + fileArray.length;
    if (selectedPlatforms.includes('instagram') && totalFiles > 10) {
      toast.error(`Instagram supports maximum 10 items in a carousel. You have ${selectedFiles.length} selected and trying to add ${fileArray.length} more.`)
      return
    }

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

    if (validFiles.length === 0) return

    // Upload files immediately for autosave
    const newUrls = await uploadFilesImmediately(validFiles)

    if (newUrls.length > 0) {
      // Add new URLs to existing uploaded media URLs
      setUploadedMediaUrls(prev => [...prev, ...newUrls])
      // Track the types of uploaded media
      setUploadedMediaTypes(prev => [...prev, ...validFiles.map(f => f.type)])
      // Clear selectedFiles since we have uploaded URLs now
      setSelectedFiles([])
    } else {
      // If upload failed, still keep files in selectedFiles for retry
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
  }

  const removeFile = (index: number) => {
    // Remove from uploadedMediaUrls if using that, otherwise from selectedFiles
    if (uploadedMediaUrls.length > 0) {
      setUploadedMediaUrls(prev => prev.filter((_, i) => i !== index))
      setUploadedMediaTypes(prev => prev.filter((_, i) => i !== index))
      toast.info('Media removed from post')
    } else {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    }
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

  // Auto-scroll to preview panel on mobile when it opens
  useEffect(() => {
    if (showPreview && previewPanelRef.current) {
      // Check if we're on mobile (below lg breakpoint which is 1024px)
      const isMobile = window.matchMedia('(max-width: 1023px)').matches

      if (isMobile) {
        // Small delay to ensure the preview panel has rendered
        setTimeout(() => {
          previewPanelRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }, 100)
      }
    }
  }, [showPreview])

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

      // Load Pinterest-specific fields if present
      if (draft.pinterest_title) {
        setPinterestTitle(draft.pinterest_title)
        console.log('Loaded Pinterest title from draft:', draft.pinterest_title)
      }
      if (draft.pinterest_description) {
        setPinterestDescription(draft.pinterest_description)
        console.log('Loaded Pinterest description from draft:', draft.pinterest_description)
      }
      if (draft.pinterest_board_id) {
        setSelectedPinterestBoard(draft.pinterest_board_id)
        console.log('Loaded Pinterest board ID from draft:', draft.pinterest_board_id)
      }
      if (draft.pinterest_link) {
        setPinterestLink(draft.pinterest_link)
        console.log('Loaded Pinterest link from draft:', draft.pinterest_link)
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

      // Load Pinterest-specific fields if present
      if (scheduledPost.pinterest_title) {
        setPinterestTitle(scheduledPost.pinterest_title)
        console.log('Loaded Pinterest title:', scheduledPost.pinterest_title)
      }
      if (scheduledPost.pinterest_description) {
        setPinterestDescription(scheduledPost.pinterest_description)
        console.log('Loaded Pinterest description:', scheduledPost.pinterest_description)
      }
      if (scheduledPost.pinterest_board_id) {
        setSelectedPinterestBoard(scheduledPost.pinterest_board_id)
        console.log('Loaded Pinterest board ID:', scheduledPost.pinterest_board_id)
      }
      if (scheduledPost.pinterest_link) {
        setPinterestLink(scheduledPost.pinterest_link)
        console.log('Loaded Pinterest link:', scheduledPost.pinterest_link)
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
          {/* Post Content - Hidden when only YouTube or Pinterest is selected, or Threads in thread mode */}
          {!(selectedPlatforms.length === 1 && (selectedPlatforms[0] === 'youtube' || selectedPlatforms[0] === 'pinterest' || (selectedPlatforms[0] === 'threads' && threadsMode === 'thread'))) && (
          <Card variant="elevated" className="hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Post Content</CardTitle>
                  <CardDescription className="text-sm sm:text-base text-gray-600">Write your message</CardDescription>
                  {/* Autosave indicator - below description on mobile, with buttons on desktop */}
                  {!editingScheduledPost && (isSaving || (lastSaved && timeAgo)) && (
                    <span className={cn(
                      "text-xs transition-opacity duration-300 block sm:hidden mt-1",
                      isSaving ? "text-gray-600 animate-pulse" : "text-gray-500"
                    )}>
                      {isSaving ? 'Saving...' : `Saved ${timeAgo}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Subtle autosave indicator - desktop only */}
                  {!editingScheduledPost && (isSaving || (lastSaved && timeAgo)) && (
                    <span className={cn(
                      "hidden sm:inline text-xs transition-opacity duration-300",
                      isSaving ? "text-gray-600 animate-pulse" : "text-gray-500"
                    )}>
                      {isSaving ? 'Saving...' : `Saved ${timeAgo}`}
                    </span>
                  )}

                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      disabled={selectedPlatforms.length === 0}
                      className="bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-blue-200 hover:border-blue-300 flex-1 sm:flex-initial"
                    >
                      <Eye className="mr-2 h-4 w-4 text-blue-600" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAISuggestions(true)}
                      disabled={selectedPlatforms.length === 0}
                      className="bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200 hover:border-purple-300 flex-1 sm:flex-initial"
                    >
                      <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
                      AI Suggestions
                    </Button>
                  </div>
                </div>
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
          )}

          {/* Threads Thread Mode */}
          {selectedPlatforms.length === 1 && selectedPlatforms[0] === 'threads' && (
            <Card variant="elevated" className="hover:shadow-xl transition-all duration-300 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">🧵</span>
                  Threads Options
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">
                  Choose how to post to Threads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant={threadsMode === 'single' ? 'default' : 'outline'}
                    onClick={() => setThreadsMode('single')}
                    size="sm"
                  >
                    Single Post
                  </Button>
                  <Button
                    type="button"
                    variant={threadsMode === 'thread' ? 'default' : 'outline'}
                    onClick={() => setThreadsMode('thread')}
                    size="sm"
                  >
                    Thread (Multiple Posts)
                  </Button>
                </div>
                
                {threadsMode === 'thread' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Multi-Post Thread:</strong> Creates multiple connected posts.
                        {connectedAccounts.some((acc: any) => acc.platform === 'threads' && acc.username === 'thejanorsula') ? (
                          <span className="block mt-1 text-xs">
                            ✅ Test account detected - will create connected thread replies
                          </span>
                        ) : (
                          <span className="block mt-1 text-xs">
                            ⚡ Will attempt connected threads, fallback to numbered [1/n] format if needed
                          </span>
                        )}
                      </p>
                    </div>
                    <ThreadComposer
                      onPost={(posts) => setThreadPosts(posts)}
                      onMediaChange={(media) => setThreadsThreadMedia(media)}
                      maxPosts={10}
                      maxCharsPerPost={500}
                      maxMediaPerPost={1}
                      autoUpdate={true}
                      platform="threads"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Twitter/X Thread Mode - Only show when threads are enabled */}
          {selectedPlatforms.length === 1 && selectedPlatforms[0] === 'twitter' && enableTwitterThreads && (
            <Card variant="elevated" className="hover:shadow-xl transition-all duration-300 border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">𝕏</span>
                  X (Twitter) Options
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">
                  Choose how to post to X
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Twitter thread mode temporarily disabled to conserve API calls */}
                {enableTwitterThreads ? (
                  <>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant={twitterMode === 'single' ? 'default' : 'outline'}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setTwitterMode('single')
                        }}
                        size="sm"
                      >
                        Single Tweet
                      </Button>
                      <Button
                        type="button"
                        variant={twitterMode === 'thread' ? 'default' : 'outline'}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setTwitterMode('thread')
                        }}
                        size="sm"
                      >
                        Thread (Multiple Tweets)
                      </Button>
                    </div>

                    {twitterMode === 'thread' && (
                      <div className="space-y-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Twitter Thread:</strong> Creates connected tweets (280 chars each).
                            <span className="block mt-1 text-xs">
                              ✨ Tweets will be connected as replies. Optional [1/n] numbering available.
                            </span>
                          </p>
                        </div>
                        <ThreadComposer
                          onPost={(posts) => setTwitterThreadPosts(posts)}
                          onMediaChange={(media) => setTwitterThreadMedia(media)}
                          maxPosts={15}
                          maxCharsPerPost={280}
                          maxMediaPerPost={4}
                          autoUpdate={true}
                          platform="twitter"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Single Tweet Mode:</strong> Create one tweet up to 280 characters.
                      <span className="block mt-1 text-xs text-blue-600 dark:text-blue-400">
                        💡 Thread mode is temporarily disabled to optimize API usage.
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Media Upload - Hidden when only YouTube is selected, or Threads in thread mode */}
          {!(selectedPlatforms.length === 1 && (selectedPlatforms[0] === 'youtube' || (selectedPlatforms[0] === 'threads' && threadsMode === 'thread'))) && (
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
                {selectedPlatforms.includes('instagram') && (
                  <p className="text-xs text-blue-600 font-medium mt-2">
                    💡 Instagram: {instagramAsStory
                      ? 'Stories require 9:16 aspect ratio (vertical) media'
                      : 'Select 2-10 files to create a carousel post'}
                  </p>
                )}
                {selectedPlatforms.includes('facebook') && facebookAsStory && (
                  <p className="text-xs text-blue-600 font-medium mt-2">
                    💡 Facebook Stories: Vertical format (9:16) recommended. Videos up to 120s.
                  </p>
                )}
                {selectedPlatforms.includes('pinterest') && (
                  <p className="text-xs text-red-600 font-medium mt-2">
                    📌 Pinterest: 1 image/video = Pin | 2-5 images = Carousel | Video = Auto cover
                  </p>
                )}
                {selectedPlatforms.includes('bluesky') && (
                  <p className="text-xs text-blue-600 font-medium mt-2">
                    ⚠️ Bluesky: Videos must be under 1MB (900KB recommended)
                  </p>
                )}
              </div>
              
              {/* Selected Files Display */}
              {selectedFiles.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">
                      Selected Files ({selectedFiles.length})
                    </Label>
                    <div className="flex gap-2">
                      {selectedPlatforms.includes('instagram') && selectedFiles.length > 1 && (
                        <span className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-1 rounded-full font-medium">
                          Instagram Carousel: {selectedFiles.length} items
                        </span>
                      )}
                      {selectedPlatforms.includes('pinterest') && selectedFiles.length > 0 && (
                        <span className="text-xs bg-gradient-to-r from-red-600 to-pink-600 text-white px-2 py-1 rounded-full font-medium">
                          {selectedFiles.some(f => f.type.includes('video'))
                            ? `📌 Pinterest Video Pin${selectedFiles.length > 1 ? ' (with cover)' : ''}`
                            : selectedFiles.length >= 2 && selectedFiles.length <= 5
                            ? `📌 Pinterest Carousel: ${selectedFiles.length} pins`
                            : '📌 Pinterest Image Pin'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pinterest Carousel Aspect Ratio Warning */}
                  {selectedPlatforms.includes('pinterest') && selectedFiles.length >= 2 && selectedFiles.length <= 5 && !selectedFiles.some(f => f.type.includes('video')) && (
                    <p className="text-xs text-amber-600 font-medium mt-2 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                      ⚠️ Pinterest Carousel: All images must have the same aspect ratio (e.g., all square, all portrait, or all landscape)
                    </p>
                  )}

                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {filePreviewUrls.map(({ file, url }, index) => (
                      <div key={`${file.name}-${file.size}-${index}`} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                          {/* Carousel order indicator */}
                          {selectedPlatforms.includes('instagram') && selectedFiles.length > 1 && (
                            <div className="absolute top-2 left-2 z-10 bg-black/60 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                              {index + 1}
                            </div>
                          )}
                          {file.type.startsWith('image/') ? (
                            <img
                              src={url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : file.type.startsWith('video/') ? (
                            <div className="relative w-full h-full bg-black">
                              <video
                                src={url}
                                className="w-full h-full object-cover"
                                muted
                                preload="metadata"
                              />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-white/90 rounded-full p-3 shadow-lg">
                                  <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-center">
                                <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                                <p className="text-xs text-gray-500 mt-1">File</p>
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

              {/* Show existing media from draft with drag-and-drop reordering */}
              {uploadedMediaUrls.length > 0 && selectedFiles.length === 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Previously Uploaded Media</Label>
                    {uploadedMediaUrls.length > 1 && (
                      <span className="text-xs text-blue-600 font-medium">
                        💡 Drag to reorder
                      </span>
                    )}
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={uploadedMediaUrls.map((media, idx) => getMediaUrl(media) + idx)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {uploadedMediaUrls.map((media, index) => {
                          // Extract URL from either string or object format
                          const url = getMediaUrl(media)
                          // Detect if URL is a video based on file extension
                          const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v']
                          const isVideo = videoExtensions.some(ext => url.toLowerCase().includes(ext))

                          return (
                            <SortableMediaItem
                              key={url + index}
                              url={url}
                              index={index}
                              isVideo={isVideo}
                              onRemove={() => {
                                setUploadedMediaUrls(prev => prev.filter((_, i) => i !== index))
                                toast.info('Media removed from post')
                              }}
                            />
                          )
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Scheduling */}
          <Card variant="elevated" className="hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Schedule</CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-600">When to publish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Schedule Buttons */}
              <QuickScheduleButtons
                onSelect={(date, time) => {
                  setScheduledDate(date)
                  setScheduledTime(time)
                }}
                currentDate={scheduledDate}
                currentTime={scheduledTime}
              />

              {/* Timezone Display and Date/Time Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-end">
                  <span className="text-xs text-gray-500">
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </span>
                </div>

                <CompactDateTimeInput
                  date={scheduledDate}
                  time={scheduledTime}
                  onDateChange={setScheduledDate}
                  onTimeChange={setScheduledTime}
                />
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
                <div className="sm:col-span-2 space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Scheduled for:</p>
                    <p className="text-sm text-blue-700">
                      {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
                    </p>
                  </div>
                  
                  {selectedPlatforms.includes('youtube') && youtubeVideoFile && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-600">📹</span>
                        <div className="text-sm text-amber-700">
                          <p className="font-medium mb-1">YouTube Scheduling Info:</p>
                          <p className="text-xs">• Your video will be uploaded immediately as <strong>private</strong></p>
                          <p className="text-xs">• YouTube will automatically publish it at the scheduled time</p>
                          <p className="text-xs">• You can view and manage it in YouTube Studio before it goes live</p>
                        </div>
                      </div>
                    </div>
                  )}
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
                        !(selectedPlatforms.includes('tiktok') && (selectedFiles.some(f => f.type.startsWith('video/')) || uploadedMediaUrls.some(media => {
                          const url = getMediaUrl(media)
                          return url.includes('.mp4') || url.includes('.mov') || url.includes('.avi')
                        }))) &&
                        !(selectedPlatforms.includes('instagram') && instagramAsStory && (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)) &&
                        !(selectedPlatforms.includes('facebook') && facebookAsStory && (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)) &&
                        !(selectedPlatforms.length === 1 && selectedPlatforms[0] === 'facebook' && facebookAsReel && (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)) &&
                        !(selectedPlatforms.length === 1 && selectedPlatforms[0] === 'facebook' && !facebookAsStory && !facebookAsReel && (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)) &&
                        !(selectedPlatforms.length === 1 && selectedPlatforms[0] === 'threads' && threadsMode === 'thread' && threadPosts.some(p => p.trim().length > 0)))
                    }
                    onClick={handleSchedulePost}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {isPosting ? (editingScheduledPost ? 'Updating...' : 'Scheduling...') : (editingScheduledPost ? 'Update Scheduled Post' : 'Schedule Post')}
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
                      !(selectedPlatforms.includes('tiktok') && (selectedFiles.some(f => f.type.startsWith('video/')) || uploadedMediaUrls.some(media => {
                        const url = getMediaUrl(media)
                        return url && (url.includes('.mp4') || url.includes('.mov') || url.includes('.avi'))
                      }))) &&
                      !(selectedPlatforms.includes('instagram') && instagramAsStory && (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)) &&
                      !(selectedPlatforms.includes('facebook') && facebookAsStory && (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)) &&
                      !(selectedPlatforms.length === 1 && selectedPlatforms[0] === 'facebook' && facebookAsReel && (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)) &&
                      !(selectedPlatforms.length === 1 && selectedPlatforms[0] === 'facebook' && !facebookAsStory && !facebookAsReel && (selectedFiles.length > 0 || uploadedMediaUrls.length > 0)) &&
                      !(selectedPlatforms.length === 1 && selectedPlatforms[0] === 'threads' && threadsMode === 'thread' && threadPosts.some(p => p.trim())) &&
                      !(selectedPlatforms.length === 1 && selectedPlatforms[0] === 'twitter' && twitterMode === 'thread' && twitterThreadPosts.some(p => p.trim())))
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
        <div className="col-span-1 lg:col-span-1 order-1 lg:order-2 space-y-4">
          {/* Preview Panel - Show when preview is enabled */}
          {showPreview && selectedPlatforms.length > 0 && (
            <div ref={previewPanelRef}>
              <PreviewPanel
              selectedPlatforms={selectedPlatforms}
              content={postContent}
              platformContent={platformContent}
              mediaUrls={previewMediaUrls}
              instagramFormat={instagramFormat}
              facebookFormat={facebookAsReel ? 'reel' : facebookAsStory ? 'story' : 'feed'}
              youtubeFormat={youtubeAsShort ? 'short' : 'video'}
              youtubeTitle={youtubeTitle}
              youtubeDescription={youtubeDescription}
              youtubeMediaUrls={youtubePreviewUrls}
              pinterestTitle={pinterestTitle}
              pinterestDescription={pinterestDescription}
              pinterestBoard={pinterestBoards.find(b => b.id === selectedPinterestBoard)?.name}
              onClose={() => setShowPreview(false)}
              />
            </div>
          )}

         {/* Platform Selection */}
         <Card variant="elevated" className="hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Platforms</CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">Choose where to publish</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Platform Selection Buttons - 2 Column Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {platforms.map((platform) => {
                    // Special handling for "Request Platform" card
                    if ((platform as any).isSpecial && platform.id === 'request') {
                      return (
                        <button
                          key={platform.id}
                          onClick={() => setShowRequestPlatformModal(true)}
                          className={cn(
                            "w-full flex items-center gap-2.5 p-3.5 rounded-lg border-2 transition-all text-left min-h-[60px]",
                            "border-dashed border-green-300 hover:border-green-400 bg-gradient-to-br from-green-50/50 to-emerald-50/50 hover:from-green-100/50 hover:to-emerald-100/50"
                          )}
                        >
                          <span className="text-base">{platform.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-green-700 truncate">{platform.name}</p>
                            <p className="text-xs text-green-600">Vote here</p>
                          </div>
                        </button>
                      )
                    }

                    const platformAccounts = connectedAccounts.filter(acc => acc.platform === platform.id)
                    const hasAccounts = platformAccounts.length > 0

                    return (
                      <button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-3.5 rounded-lg border-2 transition-all text-left min-h-[60px]",
                          selectedPlatforms.includes(platform.id)
                            ? "border-primary bg-primary/10 text-primary"
                            : hasAccounts
                              ? "border-gray-200 hover:border-gray-300"
                              : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                        )}
                        disabled={!hasAccounts}
                      >
                        <span className="text-base">{platform.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{platform.name}</p>
                          <p className="text-xs text-gray-500">
                            {hasAccounts ? 'Connected' : 'Not connected'}
                          </p>
                        </div>
                        {selectedPlatforms.includes(platform.id) && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Full-Width Platform Settings - Appears Below Grid */}
                <div className="space-y-4 mt-4">
                  {selectedPlatforms.map((platformId) => {
                    const platform = platforms.find(p => p.id === platformId)
                    const platformAccounts = connectedAccounts.filter(acc => acc.platform === platformId)

                    if (!platform || platformAccounts.length === 0) return null

                    return (
                      <div key={platformId} className="animate-in slide-in-from-top-2 duration-200">
                        <div className={cn(
                          "p-4 rounded-lg bg-gradient-to-r border transition-all",
                          platform.gradient,
                          platform.borderColor
                        )}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">{platform.icon}</span>
                            <Label className="text-sm font-semibold text-gray-800">
                              {platform.name} Settings
                            </Label>
                          </div>

                          <AccountSelector
                            platform={platform.name}
                            platformId={platform.id}
                            accounts={platformAccounts}
                            selectedAccountIds={selectedAccounts[platformId] || []}
                            onSelectionChange={(accountIds) => {
                              setSelectedAccounts(prev => ({
                                ...prev,
                                [platformId]: accountIds
                              }))
                            }}
                            multiSelect={platformAccounts.length > 1}
                          />

                          {/* Instagram Options */}
                          {platformId === 'instagram' && (
                            <div className="mt-3 pt-3 border-t border-purple-200/50 space-y-3">
                              <div>
                                <Label className="text-xs font-medium text-purple-700 mb-2 block">
                                  Content Type
                                </Label>
                                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInstagramAsStory(false)
                                      setInstagramAsReel(false)
                                      setInstagramFormat('feed-portrait')
                                    }}
                                    className={cn(
                                      "flex-1 px-2 py-2 rounded-md text-[11px] font-medium transition-all",
                                      !instagramAsStory && !instagramAsReel
                                        ? "bg-white text-purple-700 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                    )}
                                  >
                                    📰 Feed
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInstagramAsStory(true)
                                      setInstagramAsReel(false)
                                      setInstagramFormat('story')
                                    }}
                                    className={cn(
                                      "flex-1 px-2 py-2 rounded-md text-[11px] font-medium transition-all",
                                      instagramAsStory && !instagramAsReel
                                        ? "bg-white text-purple-700 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                    )}
                                  >
                                    📸 Story
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInstagramAsStory(false)
                                      setInstagramAsReel(true)
                                      setInstagramFormat('reel')
                                    }}
                                    className={cn(
                                      "flex-1 px-2 py-2 rounded-md text-[11px] font-medium transition-all",
                                      instagramAsReel
                                        ? "bg-white text-purple-700 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                    )}
                                  >
                                    🎬 Reel
                                  </button>
                                </div>
                              </div>

                              {!instagramAsStory && !instagramAsReel && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                                  <p className="text-[10px] text-purple-700 leading-relaxed">
                                    📰 Feed posts appear in followers&apos; feeds<br/>
                                    ⭐ Portrait format (4:5) recommended<br/>
                                    📐 Square (1:1) and landscape (1.91:1) also supported
                                  </p>
                                </div>
                              )}

                              {instagramAsStory && !instagramAsReel && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                                  <p className="text-[10px] text-purple-700 leading-relaxed">
                                    📸 Stories disappear after 24 hours<br/>
                                    📐 Vertical format (9:16) recommended<br/>
                                    🎥 Videos: up to 60s (ideally 15s or less)
                                  </p>
                                </div>
                              )}

                              {instagramAsReel && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                                  <p className="text-[10px] text-purple-700 leading-relaxed">
                                    🎬 Reels are short-form video content<br/>
                                    📐 Vertical format (9:16) required<br/>
                                    🎥 Videos: 3s to 90s (ideally 15-30s)
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Facebook Options */}
                          {platformId === 'facebook' && (
                            <div className="mt-3 pt-3 border-t border-blue-200/50 space-y-3">
                              <div>
                                <Label className="text-xs font-medium text-blue-700 mb-2 block">
                                  Post Type
                                </Label>
                                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFacebookAsStory(false)
                                      setFacebookAsReel(false)
                                    }}
                                    className={cn(
                                      "flex-1 px-2 py-2 rounded-md text-[11px] font-medium transition-all",
                                      !facebookAsStory && !facebookAsReel
                                        ? "bg-white text-blue-700 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                    )}
                                  >
                                    📰 Feed
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFacebookAsStory(true)
                                      setFacebookAsReel(false)
                                    }}
                                    className={cn(
                                      "flex-1 px-2 py-2 rounded-md text-[11px] font-medium transition-all",
                                      facebookAsStory && !facebookAsReel
                                        ? "bg-white text-blue-700 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                    )}
                                  >
                                    📸 Story
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFacebookAsStory(false)
                                      setFacebookAsReel(true)
                                    }}
                                    className={cn(
                                      "flex-1 px-2 py-2 rounded-md text-[11px] font-medium transition-all",
                                      facebookAsReel
                                        ? "bg-white text-blue-700 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                    )}
                                  >
                                    🎬 Reel
                                  </button>
                                </div>
                              </div>

                              {facebookAsStory && !facebookAsReel && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                  <p className="text-[10px] text-blue-700 leading-relaxed">
                                    📸 Stories disappear after 24 hours<br/>
                                    📐 Vertical format (9:16) recommended<br/>
                                    🎥 Videos: up to 120s (ideally under 15s)
                                  </p>
                                </div>
                              )}

                              {facebookAsReel && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                  <p className="text-[10px] text-blue-700 leading-relaxed">
                                    🎬 Short-form vertical video content<br/>
                                    📐 Vertical format (9:16) required<br/>
                                    ⏱️ Duration: 3-90 seconds<br/>
                                    <span className="text-amber-700 font-medium">⚠️ Use original content only - no copyrighted music</span><br/>
                                    <span className="text-blue-600">⏳ Processing may take 2-10 minutes</span>
                                  </p>
                                </div>
                              )}

                              {!facebookAsStory && !facebookAsReel && (
                                <p className="text-[10px] text-blue-600 mt-1.5">
                                  📰 Regular post will appear on your page feed
                                </p>
                              )}
                            </div>
                          )}

                          {/* YouTube Options */}
                          {platformId === 'youtube' && (
                            <div className="mt-3 pt-3 border-t border-red-200/50 space-y-3">
                              <div>
                                <Label className="text-xs font-medium text-red-700 mb-2 block">
                                  Video Type
                                </Label>
                                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => setYoutubeAsShort(false)}
                                    className={cn(
                                      "flex-1 px-2 py-2 rounded-md text-[11px] font-medium transition-all",
                                      !youtubeAsShort
                                        ? "bg-white text-red-700 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                    )}
                                  >
                                    📹 Video
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setYoutubeAsShort(true)}
                                    className={cn(
                                      "flex-1 px-2 py-2 rounded-md text-[11px] font-medium transition-all",
                                      youtubeAsShort
                                        ? "bg-white text-red-700 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                    )}
                                  >
                                    🎬 Short
                                  </button>
                                </div>
                              </div>

                              {!youtubeAsShort && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                  <p className="text-[10px] text-red-700 leading-relaxed">
                                    📹 Standard YouTube videos<br/>
                                    📐 Any aspect ratio supported
                                  </p>
                                </div>
                              )}

                              {youtubeAsShort && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                  <p className="text-[10px] text-red-700 leading-relaxed">
                                    🎬 YouTube Shorts format<br/>
                                    📐 Vertical format (9:16) required<br/>
                                    ⏱️ Duration: up to 60 seconds<br/>
                                    🖼️ Custom thumbnails not supported (YouTube auto-generates)
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {selectedPlatforms.length > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <p className="text-sm font-medium text-green-800">
                      {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''} selected
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedPlatforms.map(id => {
                        const platform = platforms.find(p => p.id === id)
                        const platformAccounts = connectedAccounts.filter(acc => acc.platform === id)
                        const selectedAccountIds = selectedAccounts[id] || []
                        const selectedAccountsForPlatform = platformAccounts.filter(acc => selectedAccountIds.includes(acc.id))

                        return (
                          <span key={id} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg text-xs font-medium shadow-sm border border-green-100">
                            <span>{platform?.icon}</span>
                            <span>{platform?.name}</span>
                            {selectedAccountsForPlatform.length > 0 && (
                              <span className="text-gray-500">
                                ({selectedAccountsForPlatform.length === 1
                                  ? selectedAccountsForPlatform[0].username || selectedAccountsForPlatform[0].account_name || 'Account'
                                  : `${selectedAccountsForPlatform.length} accounts`})
                              </span>
                            )}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pinterest Board Selection */}
            {selectedPlatforms.includes('pinterest') && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-red-600">📌</span>
                    Pinterest Pin Settings
                  </CardTitle>
                  <CardDescription>
                    Configure your Pinterest pin details
                  </CardDescription>
                  {/* Preview button - only show when Pinterest is the only platform */}
                  {selectedPlatforms.length === 1 && selectedPlatforms[0] === 'pinterest' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-blue-200 hover:border-blue-300 w-full sm:w-auto"
                    >
                      <Eye className="mr-2 h-4 w-4 text-blue-600" />
                      Preview
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )}

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
                  {/* Preview button - only show when YouTube is the only platform */}
                  {selectedPlatforms.length === 1 && selectedPlatforms[0] === 'youtube' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-blue-200 hover:border-blue-300 w-full sm:w-auto"
                    >
                      <Eye className="mr-2 h-4 w-4 text-blue-600" />
                      Preview
                    </Button>
                  )}
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
                  title={tiktokTitle}
                  setTitle={setTiktokTitle}
                  privacyLevel={tiktokPrivacyLevel}
                  setPrivacyLevel={setTiktokPrivacyLevel as any}
                  allowComment={tiktokAllowComment}
                  setAllowComment={setTiktokAllowComment}
                  allowDuet={tiktokAllowDuet}
                  setAllowDuet={setTiktokAllowDuet}
                  allowStitch={tiktokAllowStitch}
                  setAllowStitch={setTiktokAllowStitch}
                  contentDisclosureEnabled={tiktokContentDisclosure}
                  setContentDisclosureEnabled={setTiktokContentDisclosure}
                  promotionalContent={tiktokPromotionalContent}
                  setPromotionalContent={setTiktokPromotionalContent}
                  brandedContent={tiktokBrandedContent}
                  setBrandedContent={setTiktokBrandedContent}
                  isPhotoPost={uploadedMediaTypes.some(type => type.startsWith('image/')) && !uploadedMediaTypes.some(type => type.startsWith('video/'))}
                />
              </div>
            )}

            {/* LinkedIn Visibility Settings - Phase 1 Quick Wins */}
            {selectedPlatforms.includes('linkedin') && (
              <div className="mt-6">
                <LinkedInVisibilitySelector
                  visibility={linkedinVisibility}
                  setVisibility={setLinkedinVisibility}
                />
              </div>
            )}

            {/* YouTube Compliance Settings - Phase 1 Quick Wins */}
            {selectedPlatforms.includes('youtube') && (
              <div className="mt-6">
                <YouTubeComplianceSettings
                  madeForKids={youtubeMadeForKids}
                  setMadeForKids={setYoutubeMadeForKids}
                  embeddable={youtubeEmbeddable}
                  setEmbeddable={setYoutubeEmbeddable}
                  license={youtubeLicense}
                  setLicense={setYoutubeLicense}
                />
              </div>
            )}

            {/* Threads Reply Controls - Phase 1 Quick Wins */}
            {selectedPlatforms.includes('threads') && (
              <div className="mt-6">
                <ThreadsReplyControls
                  replyControl={threadsReplyControl}
                  setReplyControl={setThreadsReplyControl}
                />
              </div>
            )}

            {/* Alt Text for Accessibility - Phase 1 Quick Wins */}
            {selectedPlatforms.includes('instagram') && uploadedMediaUrls.length > 0 && (
              <div className="mt-6">
                <AltTextInput
                  platform="Instagram"
                  value={instagramAltText}
                  onChange={setInstagramAltText}
                />
              </div>
            )}

            {/* Instagram Location & Comment Controls - Phase 2A Quick Wins */}
            {selectedPlatforms.includes('instagram') && (
              <>
                <div className="mt-6">
                  <InstagramLocationPicker
                    location={instagramLocation}
                    setLocation={setInstagramLocation}
                  />
                </div>
                <div className="mt-6">
                  <InstagramCommentControls
                    disableComments={instagramDisableComments}
                    setDisableComments={setInstagramDisableComments}
                  />
                </div>
              </>
            )}

            {selectedPlatforms.includes('pinterest') && uploadedMediaUrls.length > 0 && (
              <div className="mt-6">
                <AltTextInput
                  platform="Pinterest"
                  value={pinterestAltText}
                  onChange={setPinterestAltText}
                />
              </div>
            )}

            {selectedPlatforms.includes('bluesky') && uploadedMediaUrls.length > 0 && (
              <div className="mt-6">
                <AltTextInput
                  platform="Bluesky"
                  value={blueskyAltText}
                  onChange={setBlueskyAltText}
                />
              </div>
            )}

            {/* Bluesky Reply Controls - Phase 3 Community Controls */}
            {selectedPlatforms.includes('bluesky') && (
              <div className="mt-6">
                <BlueskyReplyControls
                  replyControl={blueskyReplyControl}
                  setReplyControl={setBlueskyReplyControl}
                />
              </div>
            )}

            {/* Facebook Publish Controls - Phase 3 Community Controls */}
            {selectedPlatforms.includes('facebook') && (
              <div className="mt-6">
                <FacebookPublishControls
                  publishAsDraft={facebookPublishAsDraft}
                  setPublishAsDraft={setFacebookPublishAsDraft}
                />
              </div>
            )}
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

      {/* Request Platform Modal */}
      <RequestPlatformModal
        open={showRequestPlatformModal}
        onOpenChange={setShowRequestPlatformModal}
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
