'use client'

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
  TrendingUp,
  Clock,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SubscriptionGate } from '@/components/subscription/subscription-gate'

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
}

interface PostStats {
  likes: number
  comments: number
  shares: number
  views: number
}

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  instagram: '📷',
  facebook: 'f',
  linkedin: 'in',
  youtube: '▶',
  tiktok: '♪',
  threads: '@',
  bluesky: '🦋',
  pinterest: 'P',
}

export default function PostedPostsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [postedPosts, setPostedPosts] = useState<PostedPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPostedPosts = async () => {
    try {
      // Fetch posts with 'posted' and 'failed' status
      const response = await fetch('/api/posts/schedule?status=posted,failed')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const data = await response.json()
      setPostedPosts(data.posts || [])
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
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([])
    } else {
      setSelectedPosts(filteredPosts.map(post => post.id))
    }
  }

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Posted</h1>
        <p className="text-gray-600 mt-1">View and analyze your published posts</p>
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
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Send className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold">{filteredPosts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold">
                  {filteredPosts.reduce((sum, post) => sum + getPostStats(post).views, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">❤️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Likes</p>
                <p className="text-2xl font-bold">
                  {filteredPosts.reduce((sum, post) => sum + getPostStats(post).likes, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">💬</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Engagement</p>
                <p className="text-2xl font-bold">
                  {(() => {
                    const totalViews = filteredPosts.reduce((sum, post) => sum + getPostStats(post).views, 0)
                    const totalEngagement = filteredPosts.reduce((sum, post) => sum + getTotalEngagement(getPostStats(post)), 0)
                    return totalViews > 0 ? Math.round((totalEngagement / totalViews) * 100) : 0
                  })()}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedPosts.length > 0 && (
        <Card className="bg-primary/10 border-primary">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium">
              {selectedPosts.length} post{selectedPosts.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkViewOriginal}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Original
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin" />
              <p className="text-gray-500">Loading posted content...</p>
            </CardContent>
          </Card>
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Send className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">No posted content found</p>
              <p className="text-sm text-gray-400">Your published posts will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4">
              <input
                type="checkbox"
                checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
                onChange={toggleAllPosts}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Select all</span>
            </div>
            
            {filteredPosts.map(post => {
              const stats = getPostStats(post)           
              return (
                <Card key={post.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-start p-4 gap-4">
                      <input
                        type="checkbox"
                        checked={selectedPosts.includes(post.id)}
                        onChange={() => togglePostSelection(post.id)}
                        className="mt-1 rounded border-gray-300"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg line-clamp-1">{stripHtml(post.content).slice(0, 60)}...</h3>
                            <p className="text-gray-600 mt-1 line-clamp-2">{stripHtml(post.content)}</p>
                            
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                {post.status === 'posted' ? (
                                  <>
                                    <Send className="h-4 w-4 text-green-500" />
                                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">
                                      Posted
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <X className="h-4 w-4 text-red-500" />
                                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">
                                      Failed
                                    </span>
                                  </>
                                )}
                              </div>
                              
                              <span className="text-sm text-gray-500">
                                {post.posted_at ? formatDate(post.posted_at) : formatDate(post.scheduled_for)}
                              </span>
                              
                              <div className="flex gap-1">
                                {post.platforms.map(platform => (
                                  <span
                                    key={platform}
                                    className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs"
                                    title={platform}
                                  >
                                    {platformIcons[platform] || platform[0].toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            {post.error_message && (
                              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                                <strong>Error:</strong> {post.error_message}
                              </div>
                            )}
                            
                            {/* Performance Stats - show for all posts, but note when no data available */}
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              {post.status === 'posted' ? (
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                  <div className="text-center">
                                    <p className="text-sm font-medium text-gray-600">Views</p>
                                    <p className="text-lg font-bold">{stats.views.toLocaleString()}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm font-medium text-gray-600">Likes</p>
                                    <p className="text-lg font-bold">{stats.likes}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm font-medium text-gray-600">Comments</p>
                                    <p className="text-lg font-bold">{stats.comments}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm font-medium text-gray-600">Shares</p>
                                    <p className="text-lg font-bold">{stats.shares}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm font-medium text-gray-600">Engagement</p>
                                    <p className="text-lg font-bold">{getEngagementRate(stats)}%</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-sm text-gray-500">
                                  No analytics available for failed posts
                                </div>
                              )}
                              {post.status === 'posted' && stats.views === 0 && stats.likes === 0 && (
                                <div className="text-center text-xs text-gray-400 mt-2">
                                  Analytics data will be available when platforms provide engagement metrics
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </>
        )}
      </div>
        </div>
      </SubscriptionGate>
    </div>
  )
}
