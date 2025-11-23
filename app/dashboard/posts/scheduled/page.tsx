'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CustomSelect } from '@/components/ui/custom-select'
import { 
  Search, 
  Clock,
  Calendar,
  Play,
  Pause,
  Send,
  Plus,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import { ScheduledPostsList } from '@/components/scheduled-posts-list'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'

interface ScheduledPost {
  id: string
  content: string
  platforms: string[]
  platform_content: Record<string, string>
  media_urls: string[]
  platform_media_url?: string
  scheduled_for: string
  status: 'pending' | 'posting' | 'posted' | 'failed' | 'cancelled' | 'processing'
  created_at: string
  // Thread-specific fields
  threads_mode?: string
  threads_thread_media?: any[][]
  // Async job tracking
  processing_state?: any
}

export default function ScheduledPostsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterTimeRange, setFilterTimeRange] = useState('all')
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch('/api/posts/schedule?status=pending,posting,cancelled,processing')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const data = await response.json()
      const posts = data.posts || []
      
      // Sort by scheduled_for (soonest first)
      const sortedPosts = posts.sort((a: ScheduledPost, b: ScheduledPost) => {
        return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
      })
      
      setScheduledPosts(sortedPosts)
    } catch (error) {
      console.error('Error fetching scheduled posts:', error)
      toast.error('Failed to load scheduled posts')
    } finally {
      setLoading(false)
    }
  }

  const processDuePosts = async () => {
    try {
      toast.info('Processing due posts...')
      
      const response = await fetch('/api/cron/process-scheduled-posts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test'}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to process posts')
      }
      
      const data = await response.json()
      toast.success(`Processed ${data.processed || 0} posts`)
      
      // Refresh the list
      fetchScheduledPosts()
    } catch (error) {
      console.error('Error processing posts:', error)
      toast.error('Failed to process posts')
    }
  }

  const handlePostNow = async (postId: string) => {
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
      
      if (!response.ok) {
        throw new Error('Failed to update post')
      }
      
      // Process the posts
      await processDuePosts()
      
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
      fetchScheduledPosts()
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
      fetchScheduledPosts()
    } catch (error) {
      console.error('Error resuming post:', error)
      toast.error('Failed to resume post')
    }
  }

  useEffect(() => {
    fetchScheduledPosts()
  }, [])

  const filteredPosts = scheduledPosts.filter(post => {
    // Search filter
    if (searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())) return false

    // Status filter (existing Active/Paused)
    if (filterStatus === 'active' && post.status !== 'pending') return false
    if (filterStatus === 'paused' && post.status !== 'cancelled') return false

    // Platform filter
    if (filterPlatform !== 'all' && !post.platforms.includes(filterPlatform)) return false

    // Time range filter (forward-looking for scheduled content)
    if (filterTimeRange !== 'all') {
      const scheduledDate = new Date(post.scheduled_for)
      const now = new Date()
      const hoursDiff = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      const daysDiff = hoursDiff / 24

      if (filterTimeRange === '24h' && hoursDiff > 24) return false
      if (filterTimeRange === '7days' && daysDiff > 7) return false
      if (filterTimeRange === '30days' && daysDiff > 30) return false
      if (filterTimeRange === '90days' && daysDiff > 90) return false
    }

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

  const handleBulkDelete = async () => {
    if (selectedPosts.length === 0) return
    
    const confirmMessage = `Are you sure you want to delete ${selectedPosts.length} scheduled post${selectedPosts.length > 1 ? 's' : ''}?`
    if (!confirm(confirmMessage)) return

    try {
      const deletePromises = selectedPosts.map(postId => 
        fetch(`/api/posts/schedule?id=${postId}`, {
          method: 'DELETE'
        })
      )

      await Promise.all(deletePromises)
      
      toast.success(`Deleted ${selectedPosts.length} post${selectedPosts.length > 1 ? 's' : ''}`)
      setSelectedPosts([])
      fetchScheduledPosts()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete posts')
    }
  }

  const handleEditPost = (postId: string) => {
    window.location.href = `/dashboard/create/new?scheduledPostId=${postId}`
  }

  const activePosts = scheduledPosts.filter(post => post.status === 'pending').length
  const pausedPosts = scheduledPosts.filter(post => post.status === 'cancelled').length

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
              <Clock className="h-8 w-8" />
            </div>
            Scheduled Posts
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Manage your upcoming social media posts</p>
        </div>
        <Link href="/dashboard/create/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Post
          </Button>
        </Link>
      </div>

      <SubscriptionGate feature="scheduled posts">
        <div className="space-y-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search scheduled posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <CustomSelect
              value={filterPlatform}
              onChange={setFilterPlatform}
              options={[
                { value: 'all', label: 'All Platforms' },
                { value: 'facebook', label: 'Facebook' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'bluesky', label: 'Bluesky' },
                { value: 'twitter', label: 'Twitter' },
                { value: 'linkedin', label: 'LinkedIn' },
                { value: 'threads', label: 'Threads' },
                { value: 'youtube', label: 'YouTube' },
                { value: 'tiktok', label: 'TikTok' },
                { value: 'pinterest', label: 'Pinterest' }
              ]}
              className="min-w-[150px] h-10"
            />
            <CustomSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'all', label: 'All Posts' },
                { value: 'active', label: 'Active Only' },
                { value: 'paused', label: 'Paused Only' }
              ]}
              className="min-w-[150px] h-10"
            />
            <CustomSelect
              value={filterTimeRange}
              onChange={setFilterTimeRange}
              options={[
                { value: 'all', label: 'All Time' },
                { value: '24h', label: 'Next 24 Hours' },
                { value: '7days', label: 'Next 7 Days' },
                { value: '30days', label: 'Next 30 Days' },
                { value: '90days', label: 'Next 90 Days' }
              ]}
              className="min-w-[150px] h-10"
            />
            {/* Add post count */}
            <div className="flex items-center text-sm text-gray-600">
              {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
              {activePosts > 0 && ` (${activePosts} active, ${pausedPosts} paused)`}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedPosts.length > 0 && (
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="flex items-center justify-between py-4">
                <span className="text-sm font-medium text-purple-900">
                  {selectedPosts.length} post{selectedPosts.length > 1 ? 's' : ''} selected
                </span>
                <Button variant="outline" size="sm" onClick={handleBulkDelete} className="hover:bg-red-50 hover:border-red-300">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Posts Grid */}
          <ScheduledPostsList
            posts={paginatedPosts}
            selectedPosts={selectedPosts}
            onTogglePostSelection={togglePostSelection}
            onToggleAllPosts={toggleAllPosts}
            onPostNow={handlePostNow}
            onPausePost={handlePausePost}
            onResumePost={handleResumePost}
            onEditPost={handleEditPost}
            loading={loading}
          />

          {/* Pagination */}
          {!loading && filteredPosts.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredPosts.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemLabel="posts"
            />
          )}
        </div>
      </SubscriptionGate>
    </div>
  )
}