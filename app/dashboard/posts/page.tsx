'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/custom-select'
import { 
  Search, 
  FileText,
  Clock,
  Send,
  Edit,
  Trash2,
  Plus
} from 'lucide-react'
import dynamicImport from 'next/dynamic'
import { toast } from 'sonner'
import { PostCard } from '@/components/post-card'

const SubscriptionGate = dynamicImport(
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

interface UnifiedPost {
  id: string
  content: string
  platforms: string[]
  status: string
  scheduled_for?: string
  created_at: string
  updated_at?: string
  posted_at?: string
  media_urls?: string[]
  source: 'draft' | 'scheduled' | 'posted'
  platform_content?: Record<string, string>
  post_results?: any[]
  error_message?: string
  platform_media_url?: string
  pinterest_title?: string
  pinterest_description?: string
  title?: string
}

const tabs = [
  { id: 'all', label: 'All Posts', icon: FileText },
  { id: 'scheduled', label: 'Scheduled', icon: Clock },
  { id: 'posted', label: 'Posted', icon: Send },
  { id: 'draft', label: 'Drafts', icon: Edit },
]

export default function PostsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [allPosts, setAllPosts] = useState<UnifiedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('recent')

  const fetchAllPosts = async () => {
    try {
      // Fetch drafts, scheduled, and posted posts concurrently
      const [draftsResponse, scheduledResponse, postedResponse] = await Promise.all([
        fetch('/api/drafts'),
        fetch('/api/posts/schedule?status=all'),
        fetch('/api/posts/posted-with-media')
      ])
      
      if (!draftsResponse.ok || !scheduledResponse.ok || !postedResponse.ok) {
        throw new Error('Failed to fetch posts')
      }
      
      const [draftsData, scheduledData, postedData] = await Promise.all([
        draftsResponse.json(),
        scheduledResponse.json(),
        postedResponse.json()
      ])
      
      // Transform and combine the data
      const drafts: UnifiedPost[] = (draftsData.drafts || []).map((draft: any) => ({
        ...draft,
        status: 'draft',
        source: 'draft' as const
      }))
      
      const scheduled: UnifiedPost[] = (scheduledData.posts || []).map((post: any) => ({
        ...post,
        // Keep the original status (pending, posting, cancelled, etc.)
        // but ensure we have a status field
        status: post.status || 'pending',
        source: 'scheduled' as const
      }))
      
      const posted: UnifiedPost[] = (postedData.posts || []).map((post: any) => ({
        ...post,
        status: 'posted',
        source: 'posted' as const
      }))
      
      // Combine and sort by most recent first
      const combined = [...drafts, ...scheduled, ...posted].sort((a, b) => {
        const aDate = new Date(a.updated_at || a.posted_at || a.created_at)
        const bDate = new Date(b.updated_at || b.posted_at || b.created_at)
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

  const filteredPosts = allPosts
    .filter(post => {
      // Tab filtering - need to check both status and source for proper filtering
      if (activeTab === 'scheduled') {
        // For scheduled tab, show only posts with pending, posting, or cancelled status
        if (!['pending', 'posting', 'cancelled'].includes(post.status)) return false
      } else if (activeTab === 'posted') {
        // For posted tab, show only posts with posted status
        if (post.status !== 'posted') return false
      } else if (activeTab === 'draft') {
        // For draft tab, show only posts with draft status
        if (post.status !== 'draft') return false
      }
      // activeTab === 'all' shows everything
      
      // Search filtering
      const content = stripHtml(post.content)
      if (searchQuery && !content.toLowerCase().includes(searchQuery.toLowerCase())) return false
      
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        const aDate = new Date(a.updated_at || a.posted_at || a.created_at)
        const bDate = new Date(b.updated_at || b.posted_at || b.created_at)
        return bDate.getTime() - aDate.getTime()
      }
      return 0
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

  const handleEditPost = (postId: string) => {
    const post = allPosts.find(p => p.id === postId)
    if (!post) return
    
    if (post.source === 'draft') {
      router.push(`/dashboard/create/new?draftId=${postId}`)
    } else if (post.source === 'scheduled') {
      router.push(`/dashboard/create/new?scheduledPostId=${postId}`)
    } else {
      toast.info('Cannot edit posted content')
    }
  }

  const handleDeletePost = async (postId: string) => {
    const post = allPosts.find(p => p.id === postId)
    if (!post) return

    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      let response
      if (post.source === 'draft') {
        response = await fetch(`/api/drafts?id=${postId}`, { method: 'DELETE' })
      } else if (post.source === 'scheduled') {
        response = await fetch(`/api/posts/schedule?id=${postId}`, { method: 'DELETE' })
      } else {
        toast.error('Cannot delete posted content')
        return
      }

      if (!response.ok) throw new Error('Failed to delete')
      
      toast.success('Post deleted successfully')
      fetchAllPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Failed to delete post')
    }
  }

  const handlePostNow = async (postId: string) => {
    const post = allPosts.find(p => p.id === postId)
    if (!post || post.source !== 'scheduled') return

    try {
      toast.info('Posting now...')
      
      // Update the post's scheduled_for to now
      const response = await fetch('/api/posts/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: postId,
          scheduledFor: new Date().toISOString()
        })
      })
      
      if (!response.ok) throw new Error('Failed to update post')
      
      // Trigger processing
      await fetch('/api/cron/process-scheduled-posts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test'}`
        }
      })
      
      toast.success('Post published successfully')
      fetchAllPosts()
    } catch (error) {
      console.error('Error posting now:', error)
      toast.error('Failed to post now')
    }
  }

  const handlePausePost = async (postId: string) => {
    try {
      const response = await fetch('/api/posts/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: postId,
          status: 'cancelled'
        })
      })
      
      if (!response.ok) throw new Error('Failed to pause post')
      
      toast.success('Post paused')
      fetchAllPosts()
    } catch (error) {
      console.error('Error pausing post:', error)
      toast.error('Failed to pause post')
    }
  }

  const handleResumePost = async (postId: string) => {
    try {
      const response = await fetch('/api/posts/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: postId,
          status: 'pending'
        })
      })
      
      if (!response.ok) throw new Error('Failed to resume post')
      
      toast.success('Post resumed')
      fetchAllPosts()
    } catch (error) {
      console.error('Error resuming post:', error)
      toast.error('Failed to resume post')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPosts.length === 0) return
    
    const confirmMessage = `Are you sure you want to delete ${selectedPosts.length} post${selectedPosts.length > 1 ? 's' : ''}?`
    if (!confirm(confirmMessage)) return

    try {
      const deletePromises = selectedPosts.map(async (postId) => {
        const post = allPosts.find(p => p.id === postId)
        if (!post) return null

        if (post.source === 'draft') {
          return fetch(`/api/drafts?id=${postId}`, { method: 'DELETE' })
        } else if (post.source === 'scheduled') {
          return fetch(`/api/posts/schedule?id=${postId}`, { method: 'DELETE' })
        }
        return null
      })

      await Promise.all(deletePromises)
      
      toast.success(`Deleted ${selectedPosts.length} post${selectedPosts.length > 1 ? 's' : ''}`)
      setSelectedPosts([])
      fetchAllPosts()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete posts')
    }
  }

  // Get post variant for PostCard
  const getPostVariant = (post: UnifiedPost): 'posted' | 'scheduled' | 'draft' => {
    if (post.status === 'posted') return 'posted'
    if (post.status === 'draft') return 'draft'
    return 'scheduled'
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
              <FileText className="h-8 w-8" />
            </div>
            All Posts
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Manage all your social media content in one place</p>
        </div>
        <Button 
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
          onClick={() => router.push('/dashboard/create/new')}
        >
          <Plus className="mr-2 h-5 w-5" />
          Create Post
        </Button>
      </div>

      <SubscriptionGate feature="post management">
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon
              const count = tab.id === 'all' ? allPosts.length :
                           tab.id === 'scheduled' ? allPosts.filter(p => ['pending', 'posting', 'cancelled'].includes(p.status)).length :
                           tab.id === 'posted' ? allPosts.filter(p => p.status === 'posted').length :
                           tab.id === 'draft' ? allPosts.filter(p => p.status === 'draft').length : 0
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? "bg-white/20" : "bg-gray-200"
                  }`}>
                    {count}
                  </span>
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
            <CustomSelect
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'recent', label: 'Most Recent' },
                { value: 'oldest', label: 'Oldest First' }
              ]}
              className="min-w-[150px] h-10"
            />
            {/* Add post count */}
            <div className="flex items-center text-sm text-gray-600">
              {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedPosts.length > 0 && (
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="flex items-center justify-between py-4">
                <span className="text-sm font-medium text-purple-900">
                  {selectedPosts.length} post{selectedPosts.length > 1 ? 's' : ''} selected
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleBulkDelete}
                  className="hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Posts Grid */}
          {loading ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin" />
                <p className="text-gray-500">Loading posts...</p>
              </CardContent>
            </Card>
          ) : filteredPosts.length === 0 ? (
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
              <CardContent className="text-center py-16">
                <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-6">
                  <FileText className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery ? 'Try a different search term' : 'Create your first post to get started'}
                </p>
                {!searchQuery && (
                  <Button 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                    onClick={() => router.push('/dashboard/create/new')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Post
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Select all checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
                  onChange={toggleAllPosts}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Select all ({filteredPosts.length} posts)</span>
              </div>
              
              {/* Grid of posts */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    variant={getPostVariant(post)}
                    selected={selectedPosts.includes(post.id)}
                    onToggleSelection={() => togglePostSelection(post.id)}
                    onEdit={post.source !== 'posted' ? () => handleEditPost(post.id) : undefined}
                    onDelete={post.source === 'draft' ? () => handleDeletePost(post.id) : undefined}
                    onPostNow={post.source === 'scheduled' && (post.status === 'pending' || post.status === 'cancelled') ? () => handlePostNow(post.id) : undefined}
                    onPause={post.source === 'scheduled' && post.status === 'pending' ? () => handlePausePost(post.id) : undefined}
                    onResume={post.source === 'scheduled' && post.status === 'cancelled' ? () => handleResumePost(post.id) : undefined}
                    onLoadDraft={post.source === 'draft' ? () => handleEditPost(post.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </SubscriptionGate>
    </div>
  )
}