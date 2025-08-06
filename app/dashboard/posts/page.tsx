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
  Clock,
  Send,
  FileText,
  Pause,
  X,
  Play
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface UnifiedPost {
  id: string
  title: string
  content: string
  platforms: string[]
  status: string
  type: 'draft' | 'scheduled'
  scheduled_for?: string
  created_at: string
  updated_at?: string
  posted_at?: string
  media_urls?: string[]
  source?: 'draft' | 'scheduled'
  platform_content?: Record<string, string>
  post_results?: any[]
  error_message?: string
}

interface PostStats {
  views: number
  likes: number
  comments: number
  shares: number
}

const mockPosts = [
  {
    id: 1,
    title: 'Product Launch Announcement',
    content: 'Excited to announce our latest product that will revolutionize...',
    platforms: ['twitter', 'facebook', 'linkedin'],
    status: 'scheduled',
    scheduledFor: '2024-01-25 10:00 AM',
    createdAt: '2024-01-15',
  },
  {
    id: 2,
    title: 'Weekly Tips Thread',
    content: 'Here are 5 tips to improve your productivity this week...',
    platforms: ['twitter', 'instagram'],
    status: 'posted',
    postedAt: '2024-01-20 2:00 PM',
    createdAt: '2024-01-19',
    stats: {
      likes: 234,
      comments: 45,
      shares: 12
    }
  },
  {
    id: 3,
    title: 'Customer Success Story',
    content: 'Read how Company X increased their revenue by 150% using...',
    platforms: ['linkedin'],
    status: 'draft',
    createdAt: '2024-01-18',
  },
  {
    id: 4,
    title: 'Behind the Scenes',
    content: 'Take a look at how we build our products from idea to launch...',
    platforms: ['instagram', 'tiktok', 'youtube'],
    status: 'scheduled',
    scheduledFor: '2024-01-28 4:00 PM',
    createdAt: '2024-01-17',
  },
]

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  instagram: '📷',
  facebook: 'f',
  linkedin: 'in',
  youtube: '▶',
  tiktok: '♪',
}

const tabs = [
  { id: 'all', label: 'All Posts', icon: FileText },
  { id: 'scheduled', label: 'Scheduled', icon: Clock },
  { id: 'posted', label: 'Posted', icon: Send },
  { id: 'draft', label: 'Drafts', icon: Edit },
]

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [allPosts, setAllPosts] = useState<UnifiedPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAllPosts = async () => {
    try {
      // Fetch drafts and scheduled posts concurrently
      const [draftsResponse, scheduledResponse] = await Promise.all([
        fetch('/api/drafts'),
        fetch('/api/posts/schedule')
      ])
      
      if (!draftsResponse.ok || !scheduledResponse.ok) {
        throw new Error('Failed to fetch posts')
      }
      
      const [draftsData, scheduledData] = await Promise.all([
        draftsResponse.json(),
        scheduledResponse.json()
      ])
      
      // Transform and combine the data
      const drafts: UnifiedPost[] = (draftsData.drafts || []).map((draft: any) => ({
        ...draft,
        status: 'draft' as const,
        source: 'draft' as const
      }))
      
      const scheduled: UnifiedPost[] = (scheduledData.posts || []).map((post: any) => ({
        ...post,
        source: 'scheduled' as const
      }))
      
      // Combine and sort by most recent first
      const combined = [...drafts, ...scheduled].sort((a, b) => {
        const aDate = new Date(a.updated_at || a.created_at)
        const bDate = new Date(b.updated_at || b.created_at)
        return bDate.getTime() - aDate.getTime()
      })
      
      setAllPosts(combined)
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchAllPosts()
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

  const filteredPosts = allPosts.filter(post => {
    // Tab filtering
    if (activeTab === 'scheduled' && !['pending', 'posting', 'cancelled'].includes(post.status)) return false
    if (activeTab === 'posted' && !['posted', 'failed'].includes(post.status)) return false
    if (activeTab === 'draft' && post.status !== 'draft') return false
    
    // Search filtering
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700'
      case 'posted': return 'bg-green-100 text-green-700'
      case 'draft': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock
      case 'posting': return Send
      case 'posted': return Send
      case 'failed': return X
      case 'cancelled': return Pause
      case 'draft': return FileText
      default: return FileText
    }
  }
  
  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'pending': return 'Scheduled'
      case 'posting': return 'Posting'
      case 'posted': return 'Posted'
      case 'failed': return 'Failed'
      case 'cancelled': return 'Paused'
      case 'draft': return 'Draft'
      default: return status
    }
  }
  
  const formatDate = (dateString: string, includeTime: boolean = false) => {
    const date = new Date(dateString)
    if (includeTime) {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPosts.length === 0) return
    
    const confirmMessage = `Are you sure you want to delete ${selectedPosts.length} post${selectedPosts.length > 1 ? 's' : ''}? This action cannot be undone.`
    if (!confirm(confirmMessage)) return

    try {
      const deletePromises = selectedPosts.map(async (postId) => {
        const post = allPosts.find(p => p.id === postId)
        if (!post) return null

        if (post.source === 'draft') {
          return fetch(`/api/drafts?id=${postId}`, { method: 'DELETE' })
        } else {
          return fetch(`/api/posts/schedule?id=${postId}`, { method: 'DELETE' })
        }
      })

      const results = await Promise.all(deletePromises)
      const failed = results.filter(r => r && !r.ok)

      if (failed.length === 0) {
        toast.success(`Successfully deleted ${selectedPosts.length} post${selectedPosts.length > 1 ? 's' : ''}`)
        setSelectedPosts([])
        fetchAllPosts()
      } else {
        toast.error(`Failed to delete ${failed.length} post${failed.length > 1 ? 's' : ''}`)
        fetchAllPosts()
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
        const originalPost = allPosts.find(p => p.id === postId)
        if (!originalPost) return null

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
        fetchAllPosts()
      } else {
        toast.error(`Failed to duplicate some posts`)
      }
    } catch (error) {
      console.error('Bulk duplicate error:', error)
      toast.error('Failed to duplicate posts')
    }
  }

  const handleBulkEdit = () => {
    if (selectedPosts.length === 1) {
      const post = allPosts.find(p => p.id === selectedPosts[0])
      if (post) {
        handleEditPost(post)
      }
    } else if (selectedPosts.length > 1) {
      toast.info('Select only one post to edit')
    }
  }

  const handleEditPost = (post: UnifiedPost) => {
    if (post.source === 'draft') {
      window.location.href = `/dashboard/create/new?draftId=${post.id}`
    } else {
      window.location.href = `/dashboard/create/new?scheduledPostId=${post.id}`
    }
  }

  const getPostStats = (post: UnifiedPost): PostStats => {
    if (!post.post_results || !Array.isArray(post.post_results)) {
      return { views: 0, likes: 0, comments: 0, shares: 0 }
    }
    
    const successfulResults = post.post_results.filter(result => result.success && result.data)
    let totalStats = { views: 0, likes: 0, comments: 0, shares: 0 }
    
    successfulResults.forEach(result => {
      const data = result.data
      if (data.metrics) {
        totalStats.views += data.metrics.impressions || data.metrics.views || 0
        totalStats.likes += data.metrics.likes || data.metrics.reactions || 0
        totalStats.comments += data.metrics.comments || 0
        totalStats.shares += data.metrics.shares || data.metrics.reposts || 0
      }
    })
    
    return totalStats
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Posts</h1>
        <p className="text-gray-600 mt-1">Manage all your social media posts</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search posts..."
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

      {/* Bulk Actions */}
      {selectedPosts.length > 0 && (
        <Card className="bg-primary/10 border-primary">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium">
              {selectedPosts.length} post{selectedPosts.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="outline" size="sm">
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
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
              <p className="text-gray-500">Loading posts...</p>
            </CardContent>
          </Card>
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">No posts found</p>
              <p className="text-sm text-gray-400">
                {activeTab === 'all' ? 'Create your first post to get started' : 
                 activeTab === 'draft' ? 'No drafts found' :
                 activeTab === 'scheduled' ? 'No scheduled posts found' :
                 'No posted content found'}
              </p>
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
              const StatusIcon = getStatusIcon(post.status)
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
                            <h3 className="font-semibold text-lg line-clamp-1">
                              {stripHtml(post.content).slice(0, 60)}...
                            </h3>
                            <p className="text-gray-600 mt-1 line-clamp-2">{stripHtml(post.content)}</p>
                            
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <StatusIcon className="h-4 w-4 text-gray-400" />
                                <span className={cn(
                                  "text-xs px-2 py-1 rounded-full font-medium",
                                  getStatusColor(post.status)
                                )}>
                                  {getStatusDisplayText(post.status)}
                                </span>
                              </div>
                              
                              <span className="text-sm text-gray-500">
                                {post.scheduled_for && ['pending', 'posting', 'cancelled'].includes(post.status) 
                                  ? `Scheduled: ${formatDate(post.scheduled_for, true)}`
                                  : post.posted_at 
                                  ? `Posted: ${formatDate(post.posted_at, true)}`
                                  : `Created: ${formatDate(post.created_at)}`}
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
                            
                            {post.status === 'posted' && (stats.views > 0 || stats.likes > 0) && (
                              <div className="flex gap-4 mt-3 text-sm text-gray-600">
                                {stats.views > 0 && <span>{stats.views.toLocaleString()} views</span>}
                                {stats.likes > 0 && <span>{stats.likes} likes</span>}
                                {stats.comments > 0 && <span>{stats.comments} comments</span>}
                                {stats.shares > 0 && <span>{stats.shares} shares</span>}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditPost(post)}
                            >
                              <Edit className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
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
  )
}
