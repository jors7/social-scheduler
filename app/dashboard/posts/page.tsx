'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Play,
  PlusCircle
} from 'lucide-react'
import dynamic from 'next/dynamic'

const SubscriptionGate = dynamic(
  () => import('@/components/subscription/subscription-gate-wrapper').then(mod => mod.SubscriptionGateWrapper),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
)
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
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
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
    setMounted(true)
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
      router.push(`/dashboard/create/new?draftId=${post.id}`)
    } else {
      router.push(`/dashboard/create/new?scheduledPostId=${post.id}`)
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

  if (!mounted) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
                <FileText className="h-8 w-8" />
              </div>
              Posts
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Manage all your social media posts</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
              <FileText className="h-8 w-8" />
            </div>
            Posts
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Manage all your social media posts</p>
        </div>
      </div>

      <SubscriptionGate feature="post management">
        <div className="space-y-8">
          {/* Tabs */}
          <Card variant="glass" className="p-2">
            <div className="flex flex-nowrap space-x-1 sm:space-x-2 overflow-x-auto scrollbar-thin">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-200 font-medium whitespace-nowrap flex-shrink-0",
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                        : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                    )}
                  >
                    <div className={cn(
                      "p-1 rounded-lg",
                      activeTab === tab.id 
                        ? "bg-white/20" 
                        : "bg-gray-100"
                    )}>
                      <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                    <span className="text-sm sm:text-base">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </Card>

      {/* Search and Filter Bar */}
      <Card variant="elevated" className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-1 bg-purple-100 rounded-lg">
              <Search className="h-4 w-4 text-purple-600" />
            </div>
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-14 h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
            />
          </div>
          <Button 
            variant="outline" 
            className="h-12 px-6 opacity-50 cursor-not-allowed"
            onClick={(e) => {
              e.preventDefault()
              toast.info('Advanced filtering coming soon')
            }}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedPosts.length > 0 && (
        <Card variant="gradient" className="border-2 border-purple-200 shadow-lg">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4 sm:py-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-white font-semibold text-base sm:text-lg">
                {selectedPosts.length} post{selectedPosts.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm flex-1 sm:flex-initial text-sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Delete
              </Button>
              <Button variant="outline" size="sm" className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm flex-1 sm:flex-initial text-sm" onClick={handleBulkDuplicate}>
                <Copy className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Duplicate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {loading ? (
          <Card variant="elevated">
            <CardContent className="text-center py-16 bg-gradient-to-br from-purple-50 to-blue-50">
              <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-fit mx-auto mb-6">
                <Clock className="h-12 w-12 text-white animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading posts...</h3>
              <p className="text-gray-600">Please wait while we fetch your content</p>
            </CardContent>
          </Card>
        ) : filteredPosts.length === 0 ? (
          <Card variant="elevated" className="overflow-hidden">
            <CardContent className="text-center py-16 bg-gradient-to-br from-purple-50 to-blue-50">
              <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-fit mx-auto mb-6">
                <FileText className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts found</h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'all' ? 'Create your first post to get started' : 
                 activeTab === 'draft' ? 'No drafts found' :
                 activeTab === 'scheduled' ? 'No scheduled posts found' :
                 'No posted content found'}
              </p>
              {activeTab === 'all' && (
                <Button variant="gradient" size="lg" onClick={() => router.push('/dashboard/create/new')}>
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Create Your First Post
                </Button>
              )}
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
                <Card key={post.id} variant="interactive" className="overflow-hidden group border border-gray-100">
                  <CardContent className="p-0">
                    <div className="flex items-start p-3 sm:p-6 gap-2 sm:gap-4 relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <input
                        type="checkbox"
                        checked={selectedPosts.includes(post.id)}
                        onChange={() => togglePostSelection(post.id)}
                        className="mt-1 rounded border-gray-300 flex-shrink-0"
                      />
                      
                      <div className="flex-1 relative z-10 min-w-0">
                        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base sm:text-xl text-gray-900 line-clamp-1 mb-1 sm:mb-2">
                              {stripHtml(post.content).slice(0, 60)}...
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base leading-relaxed line-clamp-2">{stripHtml(post.content)}</p>
                            
                            <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-3 sm:mt-4">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className={cn(
                                  "p-1.5 sm:p-2 rounded-lg",
                                  post.status === 'posted' ? 'bg-green-100' :
                                  post.status === 'pending' ? 'bg-blue-100' :
                                  'bg-gray-100'
                                )}>
                                  <StatusIcon className={cn(
                                    "h-3 w-3 sm:h-4 sm:w-4",
                                    post.status === 'posted' ? 'text-green-600' :
                                    post.status === 'pending' ? 'text-blue-600' :
                                    'text-gray-600'
                                  )} />
                                </div>
                                <span className={cn(
                                  "text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-semibold border",
                                  post.status === 'posted' ? 'bg-green-50 text-green-700 border-green-200' :
                                  post.status === 'pending' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-gray-50 text-gray-700 border-gray-200'
                                )}>
                                  {getStatusDisplayText(post.status)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="font-medium truncate">
                                  {post.scheduled_for && ['pending', 'posting', 'cancelled'].includes(post.status) 
                                    ? `Scheduled: ${formatDate(post.scheduled_for, true)}`
                                    : post.posted_at 
                                    ? `Posted: ${formatDate(post.posted_at, true)}`
                                    : `Created: ${formatDate(post.created_at)}`}
                                </span>
                              </div>
                              
                              <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                                {post.platforms.map((platform, index) => (
                                  <div
                                    key={platform}
                                    className={cn(
                                      "w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-medium shadow-sm border sm:border-2 border-white",
                                      index === 0 ? 'bg-purple-100 text-purple-700' :
                                      index === 1 ? 'bg-blue-100 text-blue-700' :
                                      index === 2 ? 'bg-green-100 text-green-700' :
                                      'bg-orange-100 text-orange-700'
                                    )}
                                    title={platform}
                                  >
                                    {platformIcons[platform] || platform[0].toUpperCase()}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {post.error_message && (
                              <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-red-50 border border-red-200 rounded text-xs sm:text-sm text-red-600">
                                <strong>Error:</strong> {post.error_message}
                              </div>
                            )}
                            
                            {post.status === 'posted' && (stats.views > 0 || stats.likes > 0) && (
                              <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600">
                                {stats.views > 0 && <span>{stats.views.toLocaleString()} views</span>}
                                {stats.likes > 0 && <span>{stats.likes} likes</span>}
                                {stats.comments > 0 && <span>{stats.comments} comments</span>}
                                {stats.shares > 0 && <span>{stats.shares} shares</span>}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 sm:gap-3 relative z-10 flex-shrink-0">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditPost(post)}
                              className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-gray-200 text-xs sm:text-sm px-2 sm:px-3"
                            >
                              <Edit className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                              Edit
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:bg-purple-50 hover:text-purple-600 h-8 w-8 sm:h-9 sm:w-9">
                              <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
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
      </SubscriptionGate>
    </div>
  )
}
