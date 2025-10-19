'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Send,
  ExternalLink,
  Clock,
  X,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'
import { Pagination } from '@/components/ui/pagination'

interface PostedPost {
  id: string
  content: string
  platforms: string[]
  platform_content: Record<string, string>
  media_urls: string[]
  scheduled_for: string
  status: 'posted' | 'failed'
  created_at: string
  posted_at?: string
  post_results?: any[]
  error_message?: string
  platform_media_url?: string  // Generic platform media URL from API
  pinterest_media_url?: string  // Deprecated, use platform_media_url
  pinterest_title?: string
  pinterest_description?: string
  // Format flags
  instagram_as_story?: boolean
  instagram_as_reel?: boolean
  facebook_as_story?: boolean
  facebook_as_reel?: boolean
  youtube_as_short?: boolean
}

interface PostStats {
  likes: number
  comments: number
  shares: number
  views: number
  saves?: number
  reach?: number
  profileViews?: number
}

interface InstagramInsights {
  impressions: number
  reach: number
  saved: number
  likes: number
  comments: number
  shares: number
  engagement: number
  profile_views?: number
}

// Platform icons removed - using full names with colored badges instead

export default function PostedPostsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [postedPosts, setPostedPosts] = useState<PostedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingInsights, setLoadingInsights] = useState<Record<string, boolean>>({})
  const [postInsights, setPostInsights] = useState<Record<string, InstagramInsights>>({})
  const [showInsightsModal, setShowInsightsModal] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(18)

  const fetchPostedPosts = async () => {
    try {
      // Fetch posts with media URLs from server-side API
      const response = await fetch('/api/posts/posted-with-media?status=posted,failed')
      
      if (!response.ok) throw new Error('Failed to fetch posts')
      
      const data = await response.json()
      const posts = data.posts || []
      
      // Posts are already sorted by the API, just set them
      setPostedPosts(posts)
    } catch (error) {
      console.error('Error fetching posted posts:', error)
      toast.error('Failed to load posted posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPostedPosts()
  }, [])

  const stripHtml = (html: string) => {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }

  const filteredPosts = postedPosts.filter(post => {
    const content = stripHtml(post.content)
    if (searchQuery && !content.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev =>
      prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    )
  }

  const toggleAllPosts = () => {
    if (selectedPosts.length === paginatedPosts.length) {
      setSelectedPosts([])
    } else {
      setSelectedPosts(paginatedPosts.map(post => post.id))
    }
  }

  // Paginate the filtered posts
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPosts = filteredPosts.slice(startIndex, endIndex)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const fetchInstagramInsights = async (postId: string, mediaId: string) => {
    setLoadingInsights(prev => ({ ...prev, [postId]: true }))
    try {
      const response = await fetch(`/api/instagram/insights?mediaId=${mediaId}&type=media`)
      if (response.ok) {
        const data = await response.json()
        if (data.insights) {
          const insights: InstagramInsights = {
            impressions: data.insights.impressions?.value || 0,
            reach: data.insights.reach?.value || 0,
            saved: data.insights.saved?.value || 0,
            likes: data.insights.likes?.value || 0,
            comments: data.insights.comments?.value || 0,
            shares: data.insights.shares?.value || 0,
            engagement: data.insights.engagement?.value || 0,
            profile_views: data.insights.profile_views?.value || 0
          }
          setPostInsights(prev => ({ ...prev, [postId]: insights }))
          toast.success('Instagram insights loaded')
        }
      } else {
        toast.error('Failed to load Instagram insights')
      }
    } catch (error) {
      console.error('Error fetching Instagram insights:', error)
      toast.error('Failed to load insights')
    } finally {
      setLoadingInsights(prev => ({ ...prev, [postId]: false }))
    }
  }

  // Extract real stats from post_results or return zeros
  const getPostStats = (post: PostedPost): PostStats => {
    if (!post.post_results || !Array.isArray(post.post_results)) {
      return { views: 0, likes: 0, comments: 0, shares: 0 }
    }
    
    // Aggregate stats from all successful platform results
    const successfulResults = post.post_results.filter(result => result.success && result.data)
    
    let totalStats = { views: 0, likes: 0, comments: 0, shares: 0 }
    
    successfulResults.forEach(result => {
      const data = result.data
      // Different platforms store metrics differently
      if (data.metrics) {
        totalStats.views += data.metrics.impressions || data.metrics.views || 0
        totalStats.likes += data.metrics.likes || data.metrics.reactions || 0
        totalStats.comments += data.metrics.comments || 0
        totalStats.shares += data.metrics.shares || data.metrics.reposts || 0
      } else if (data.engagement) {
        totalStats.views += data.engagement.impressions || 0
        totalStats.likes += data.engagement.likes || 0
        totalStats.comments += data.engagement.comments || 0
        totalStats.shares += data.engagement.shares || 0
      }
      // For now, most platforms don&apos;t return engagement data immediately
      // So we'll show 0s which is more honest than fake data
    })
    
    return totalStats
  }

  const getTotalEngagement = (stats: PostStats) => {
    return stats.likes + stats.comments + stats.shares
  }

  const getEngagementRate = (stats: PostStats) => {
    const total = getTotalEngagement(stats)
    return stats.views > 0 ? ((total / stats.views) * 100).toFixed(1) : '0.0'
  }

  const handleBulkDelete = async () => {
    if (selectedPosts.length === 0) return
    
    const confirmMessage = `Are you sure you want to delete ${selectedPosts.length} posted post${selectedPosts.length > 1 ? 's' : ''}? This action cannot be undone.`
    if (!confirm(confirmMessage)) return

    try {
      const deletePromises = selectedPosts.map(postId => 
        fetch(`/api/posts/schedule?id=${postId}`, {
          method: 'DELETE'
        })
      )

      const results = await Promise.all(deletePromises)
      const failed = results.filter(r => !r.ok)

      if (failed.length === 0) {
        toast.success(`Successfully deleted ${selectedPosts.length} post${selectedPosts.length > 1 ? 's' : ''}`)
        setSelectedPosts([])
        fetchPostedPosts() // Refresh the list
      } else {
        toast.error(`Failed to delete ${failed.length} post${failed.length > 1 ? 's' : ''}`)
        fetchPostedPosts() // Refresh to show current state
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete posts')
    }
  }

  const handleBulkDuplicate = async () => {
    if (selectedPosts.length === 0) return
    
    try {
      const duplicatePromises = selectedPosts.map(async (postId) => {
        const originalPost = postedPosts.find(p => p.id === postId)
        if (!originalPost) return null

        // Create as draft first
        const response = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: originalPost.content,
            platforms: originalPost.platforms,
            platformContent: originalPost.platform_content || {},
            mediaUrls: originalPost.media_urls || []
          })
        })
        
        return response.ok ? response.json() : null
      })

      const results = await Promise.all(duplicatePromises)
      const successful = results.filter(r => r !== null)
      
      if (successful.length === selectedPosts.length) {
        toast.success(`Successfully duplicated ${selectedPosts.length} post${selectedPosts.length > 1 ? 's' : ''} as drafts`)
        setSelectedPosts([])
      } else {
        toast.error(`Failed to duplicate some posts`)
      }
    } catch (error) {
      console.error('Bulk duplicate error:', error)
      toast.error('Failed to duplicate posts')
    }
  }

  const handleBulkViewOriginal = () => {
    if (selectedPosts.length === 0) return

    // For now, show a message about viewing original posts
    // In a real app, this would open the original social media posts
    const selectedPostsData = postedPosts.filter(p => selectedPosts.includes(p.id))
    const platformsSet = new Set(selectedPostsData.flatMap(p => p.platforms))
    const platforms = Array.from(platformsSet)

    toast.info(`Selected posts were published on: ${platforms.join(', ')}. Original post viewing will be implemented when platform APIs provide post URLs.`)
  }


  return (
    <div className="space-y-8">
      {/* Header with gradient title */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
            <Send className="h-8 w-8" />
          </div>
          Published Posts
        </h1>
        <p className="text-gray-600 text-lg">
          View and analyze your published content across all platforms
        </p>
      </div>

      <SubscriptionGate feature="posted content">
        <div className="space-y-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search posted content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              className="opacity-50 cursor-not-allowed"
              onClick={(e) => {
                e.preventDefault()
                toast.info('Advanced filtering coming soon')
              }}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>


          {/* Bulk Actions - Glass morphism effect */}
          {selectedPosts.length > 0 && (
            <Card variant="glass" className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="flex items-center justify-between py-4">
                <span className="text-sm font-medium text-purple-900">
              {selectedPosts.length} post{selectedPosts.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkDelete} className="hover:bg-red-50 hover:border-red-300">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDuplicate} className="hover:bg-blue-50 hover:border-blue-300">
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkViewOriginal} className="hover:bg-purple-50 hover:border-purple-300">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Original
              </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts Grid */}
          <div>
        {loading ? (
          <Card variant="glass" className="border-blue-200">
            <CardContent className="text-center py-12">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4">
                <Clock className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <p className="text-gray-600 font-medium">Loading published content...</p>
            </CardContent>
          </Card>
        ) : filteredPosts.length === 0 ? (
          <Card variant="gradient" className="from-gray-50 to-gray-100">
            <CardContent className="text-center py-16">
              <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-6">
                <Send className="h-12 w-12 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No published content yet</h3>
              <p className="text-gray-600">Your successfully published posts will appear here with analytics</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 mb-6">
              <input
                type="checkbox"
                checked={selectedPosts.length === paginatedPosts.length && paginatedPosts.length > 0}
                onChange={toggleAllPosts}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Select all on this page</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedPosts.map(post => {
                // Helper function to detect if this is a story post
                const isStoryPost = () => {
                  if (!post.post_results || !Array.isArray(post.post_results)) {
                    console.log('No post_results for post:', post.id, post)
                    return false
                  }

                  console.log('Checking post for stories:', {
                    postId: post.id,
                    platforms: post.platforms,
                    post_results: post.post_results
                  })

                  const isStory = post.post_results.some((result: any) => {
                    console.log('Checking result:', {
                      platform: result.platform,
                      success: result.success,
                      hasData: !!result.data,
                      data: result.data
                    })

                    if (!result.success) return false

                    // Check for Instagram stories
                    if (result.platform === 'instagram' && result.data) {
                      console.log('Instagram post data:', {
                        postId: post.id,
                        hasType: 'type' in result.data,
                        dataType: result.data.type,
                        resultType: result.type,
                        hasThumbnail: !!result.data.thumbnailUrl,
                        fullData: result.data
                      })
                      return result.data.type === 'story' || result.type === 'story'
                    }

                    // Check for Facebook stories
                    if (result.platform === 'facebook' && result.data) {
                      console.log('Facebook post data:', {
                        postId: post.id,
                        hasIsStory: 'isStory' in result.data,
                        dataIsStory: result.data.isStory,
                        resultIsStory: result.isStory,
                        fullData: result.data
                      })
                      return result.data.isStory === true || result.isStory === true
                    }

                    return false
                  })

                  console.log('Story check result for post', post.id, ':', isStory)

                  return isStory
                }

                // Helper function to get media URL (prioritize platform-fetched media URL)
                const getMediaUrl = () => {
                  // Use platform-fetched media URL if available (includes Pinterest)
                  if (post.platform_media_url) {
                    return post.platform_media_url
                  }

                  // Fallback to pinterest_media_url for backwards compatibility
                  if (post.pinterest_media_url) {
                    return post.pinterest_media_url
                  }

                  // Otherwise use the first media URL from the array
                  if (post.media_urls && post.media_urls.length > 0) {
                    return post.media_urls[0]
                  }

                  return null
                }

                // Helper function to get display content (prioritize Pinterest title)
                const getDisplayContent = () => {
                  // Check format flags first (for stories/reels/shorts without captions)
                  const postWithFlags = post as any

                  // Check for Facebook Story
                  if (post.platforms?.includes('facebook') && postWithFlags.facebook_as_story) {
                    const content = stripHtml(post.content)
                    return content && content.trim() ? content : 'Facebook Story'
                  }

                  // Check for Facebook Reel
                  if (post.platforms?.includes('facebook') && postWithFlags.facebook_as_reel) {
                    const content = stripHtml(post.content)
                    return content && content.trim() ? content : 'Facebook Reel'
                  }

                  // Check for Instagram Story
                  if (post.platforms?.includes('instagram') && postWithFlags.instagram_as_story) {
                    const content = stripHtml(post.content)
                    return content && content.trim() ? content : 'Instagram Story'
                  }

                  // Check for Instagram Reel
                  if (post.platforms?.includes('instagram') && postWithFlags.instagram_as_reel) {
                    const content = stripHtml(post.content)
                    return content && content.trim() ? content : 'Instagram Reel'
                  }

                  // Check for YouTube Short
                  if (post.platforms?.includes('youtube') && postWithFlags.youtube_as_short) {
                    const content = stripHtml(post.content)
                    return content && content.trim() ? content : 'YouTube Short'
                  }

                  // Fallback: Check if it's a story post via post_results (for old posts)
                  if (isStoryPost()) {
                    // Determine which platform the story is from
                    if (post.platforms.includes('instagram')) {
                      return 'Instagram Story'
                    }
                    if (post.platforms.includes('facebook')) {
                      return 'Facebook Story'
                    }
                    return 'Story'
                  }

                  // For Pinterest posts, use title if available
                  if (post.platforms.includes('pinterest')) {
                    if (post.pinterest_title) {
                      return post.pinterest_title
                    }

                    // Check platform_content for Pinterest-specific content
                    if (post.platform_content?.pinterest) {
                      // Extract title from "title: description" format
                      const content = post.platform_content.pinterest
                      const colonIndex = content.indexOf(':')
                      if (colonIndex > 0) {
                        return content.substring(0, colonIndex).trim()
                      }
                      return content
                    }
                  }

                  // Check if content is empty or just whitespace
                  const trimmedContent = post.content?.trim() || ''

                  // If content is empty, show generic placeholder
                  if (!trimmedContent) {
                    return 'Untitled Post'
                  }

                  // Otherwise return regular content
                  return post.content
                }
                
                const firstMediaUrl = getMediaUrl()
                const displayContent = getDisplayContent()

                // Debug logging for Reel posts
                if (post.platforms.includes('facebook') && post.media_urls?.some(url => url.includes('.mp4'))) {
                  console.log('🎬 Facebook Reel detected:', {
                    postId: post.id,
                    platform_media_url: post.platform_media_url,
                    media_urls: post.media_urls,
                    firstMediaUrl
                  });
                }

                // Check if we have an image thumbnail (for all platforms including YouTube)
                const hasImageThumbnail = firstMediaUrl && (
                  firstMediaUrl.includes('.jpg') ||
                  firstMediaUrl.includes('.jpeg') ||
                  firstMediaUrl.includes('.png') ||
                  firstMediaUrl.includes('.webp')
                )

                // Determine if this should be rendered as a video
                // Use video tag only if it's actually a video file (not an image thumbnail)
                // Note: Pinterest video pins have image thumbnails, not video files
                const isVideo = !hasImageThumbnail &&
                  !post.platforms?.includes('pinterest') && // Don't treat Pinterest thumbnails as videos
                  firstMediaUrl && (
                    firstMediaUrl.includes('.mp4') ||
                    firstMediaUrl.includes('.mov') ||
                    firstMediaUrl.includes('.webm') ||
                    firstMediaUrl.includes('video')
                  )
                
                return (
                  <Card key={post.id} variant="elevated" className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedPosts.includes(post.id)}
                          onChange={() => togglePostSelection(post.id)}
                          className="mt-1 rounded border-gray-300"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base line-clamp-2 overflow-hidden text-ellipsis">{stripHtml(displayContent)}</h3>
                          
                          <div className="flex items-center gap-2 mt-3">
                            {post.status === 'posted' ? (
                              <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
                                Posted
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">
                                Failed
                              </span>
                            )}
                            
                            <span className="text-xs text-gray-500">
                              {post.posted_at ? formatDate(post.posted_at) : formatDate(post.scheduled_for)}
                            </span>
                          </div>
                          
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {post.platforms.map(platform => (
                              <span
                                key={platform}
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                  platform === 'facebook' && 'bg-[#1877F2]/10 text-[#1877F2]',
                                  platform === 'instagram' && 'bg-purple-500/10 text-purple-600',
                                  platform === 'twitter' && 'bg-black/10 text-gray-900',
                                  platform === 'linkedin' && 'bg-[#0A66C2]/10 text-[#0A66C2]',
                                  platform === 'threads' && 'bg-black/10 text-gray-900',
                                  platform === 'bluesky' && 'bg-[#00A8E8]/10 text-[#00A8E8]',
                                  platform === 'youtube' && 'bg-[#FF0000]/10 text-[#FF0000]',
                                  platform === 'tiktok' && 'bg-black/10 text-gray-900',
                                  platform === 'pinterest' && 'bg-[#E60023]/10 text-[#E60023]',
                                  !['facebook', 'instagram', 'twitter', 'linkedin', 'threads', 'bluesky', 'youtube', 'tiktok', 'pinterest'].includes(platform) && 'bg-gray-500/10 text-gray-700'
                                )}
                              >
                                {platform.charAt(0).toUpperCase() + platform.slice(1)}
                              </span>
                            ))}
                          </div>
                          
                          {post.error_message && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                              {post.error_message.slice(0, 100)}...
                            </div>
                          )}
                          
                          {/* Show post URLs for platforms that provide them */}
                          {post.post_results && post.post_results.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {post.post_results.map((result: any, idx: number) => {
                                if (result.success && result.url) {
                                  return (
                                    <a
                                      key={idx}
                                      href={result.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs transition-colors"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      View
                                    </a>
                                  )
                                }
                                return null
                              })}
                            </div>
                          )}
                        </div>
                        
                        {/* Thumbnail */}
                        <div className="flex-shrink-0">
                          {firstMediaUrl ? (
                            isVideo ? (
                              <video
                                src={firstMediaUrl}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                muted
                                preload="metadata"
                                onError={(e) => {
                                  // Replace video with placeholder on error
                                  const placeholder = document.createElement('div')
                                  placeholder.className = 'w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center'
                                  placeholder.innerHTML = '<svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>'
                                  e.currentTarget.parentNode?.replaceChild(placeholder, e.currentTarget)
                                }}
                              />
                            ) : (
                              <img
                                src={firstMediaUrl}
                                alt="Post media"
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                onLoad={() => {
                                  console.log('✅ Image loaded successfully:', firstMediaUrl);
                                }}
                                onError={(e) => {
                                  console.error('❌ Image failed to load:', firstMediaUrl);
                                  console.error('Error details:', e);
                                  console.log('Post data:', {
                                    platform_media_url: post.platform_media_url,
                                    media_urls: post.media_urls,
                                    hasImageThumbnail
                                  });
                                  // Replace image with placeholder on error
                                  const placeholder = document.createElement('div')
                                  placeholder.className = 'w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center'
                                  placeholder.innerHTML = '<svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>'
                                  e.currentTarget.parentNode?.replaceChild(placeholder, e.currentTarget)
                                }}
                              />
                            )
                          ) : (
                            <div className="w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                              <FileText className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredPosts.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemLabel="posts"
            />
          </>
        )}
          </div>
        </div>
      </SubscriptionGate>
    </div>
  )
}
