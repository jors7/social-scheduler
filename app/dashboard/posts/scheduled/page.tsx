'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CustomSelect } from '@/components/ui/custom-select'
import { 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Clock,
  Calendar,
  Play,
  Pause,
  Eye,
  Send,
  X,
  Plus
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ScheduledPostsList } from '@/components/scheduled-posts-list'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'

interface ScheduledPost {
  id: string
  content: string
  platforms: string[]
  platform_content: Record<string, string>
  media_urls: string[]
  scheduled_for: string
  status: 'pending' | 'posting' | 'posted' | 'failed' | 'cancelled'
  created_at: string
}

const mockScheduledPosts = [
  {
    id: 1,
    title: 'Product Launch Announcement',
    content: 'Excited to announce our latest product that will revolutionize how you manage social media...',
    platforms: ['twitter', 'facebook', 'linkedin'],
    status: 'scheduled',
    scheduledFor: '2024-08-05 10:00 AM',
    timeUntilPost: '2 days, 14 hours',
    createdAt: '2024-08-01',
    isActive: true
  },
  {
    id: 2,
    title: 'Behind the Scenes Video',
    content: 'Take a look at how we build our products from idea to launch. Our team works tirelessly...',
    platforms: ['instagram', 'tiktok', 'youtube'],
    status: 'scheduled',
    scheduledFor: '2024-08-04 4:00 PM',
    timeUntilPost: '1 day, 6 hours',
    createdAt: '2024-07-30',
    isActive: true
  },
  {
    id: 3,
    title: 'Weekly Industry Report',
    content: 'This week in tech: AI advancements, new social media features, and market trends that matter...',
    platforms: ['linkedin', 'twitter'],
    status: 'scheduled',
    scheduledFor: '2024-08-06 9:00 AM',
    timeUntilPost: '3 days, 11 hours',
    createdAt: '2024-08-02',
    isActive: true
  },
  {
    id: 4,
    title: 'Customer Spotlight',
    content: 'Meet Sarah, one of our amazing customers who increased her engagement by 300% using our platform...',
    platforms: ['instagram', 'facebook'],
    status: 'scheduled',
    scheduledFor: '2024-08-07 2:30 PM',
    timeUntilPost: '4 days, 4 hours',
    createdAt: '2024-08-01',
    isActive: false
  },
  {
    id: 5,
    title: 'Quick Tip Tuesday',
    content: '💡 Pro tip: The best time to post on LinkedIn is between 8-10 AM on weekdays. Try it and see the difference!',
    platforms: ['linkedin'],
    status: 'scheduled',
    scheduledFor: '2024-08-06 8:30 AM',
    timeUntilPost: '3 days, 10 hours',
    createdAt: '2024-08-03',
    isActive: true
  },
]

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

export default function ScheduledPostsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState('all') // all, active, paused
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchScheduledPosts = async () => {
    try {
      // Only fetch pending and posting status posts (exclude posted, failed, cancelled)
      const response = await fetch('/api/posts/schedule?status=pending,posting')
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
    console.log('=== PROCESSING DUE POSTS ===')
    
    try {
      toast.info('Processing due posts...')
      console.log('Calling cron endpoint...')
      
      const response = await fetch('/api/cron/process-scheduled-posts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test'}`
        }
      })
      
      console.log('Cron response status:', response.status)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Cron error response:', errorText)
        throw new Error('Failed to process posts')
      }
      
      const data = await response.json()
      console.log('Cron response data:', data)
      
      // Show detailed results
      if (data.results && data.results.length > 0) {
        data.results.forEach((result: any, index: number) => {
          console.log(`Result ${index + 1}:`, result)
          if (result.errors && result.errors.length > 0) {
            console.error(`Post ${result.postId} errors:`, result.errors)
          }
          if (result.platforms && result.platforms.length > 0) {
            console.log(`Post ${result.postId} succeeded on:`, result.platforms)
          }
        })
      }
      
      toast.success(`Processed ${data.processed || 0} posts`)
      
      // Refresh the list
      fetchScheduledPosts()
    } catch (error) {
      console.error('Error processing posts:', error)
      toast.error('Failed to process posts')
    }
  }

  const handlePostNow = async (postId: string) => {
    console.log('=== POST NOW BUTTON CLICKED ===')
    console.log('Post ID:', postId)
    
    try {
      toast.info('Posting now...')
      
      console.log('Updating post scheduled time...')
      // Update the post's scheduled_for to now so it gets processed
      const response = await fetch('/api/posts/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: postId,
          scheduledFor: new Date().toISOString()
        })
      })
      
      console.log('PATCH response status:', response.status)
      if (!response.ok) {
        const errorData = await response.json()
        console.error('PATCH error:', errorData)
        throw new Error('Failed to update post')
      }
      
      console.log('Post updated, now processing due posts...')
      // Process the posts (this will pick up the updated post)
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

  const formatTimeUntil = (scheduledFor: string) => {
    const now = new Date()
    const scheduled = new Date(scheduledFor)
    const diffMs = scheduled.getTime() - now.getTime()
    
    if (diffMs <= 0) return 'Overdue'
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} min`
    return `${minutes} min`
  }

  const formatScheduledDate = (scheduledFor: string) => {
    return new Date(scheduledFor).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const filteredPosts = scheduledPosts.filter(post => {
    if (searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterStatus === 'active' && post.status !== 'pending') return false
    if (filterStatus === 'paused' && post.status !== 'cancelled') return false
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

      const results = await Promise.all(deletePromises)
      const failed = results.filter(r => !r.ok)

      if (failed.length === 0) {
        toast.success(`Successfully deleted ${selectedPosts.length} post${selectedPosts.length > 1 ? 's' : ''}`)
        setSelectedPosts([])
        fetchScheduledPosts()
      } else {
        toast.error(`Failed to delete ${failed.length} post${failed.length > 1 ? 's' : ''}`)
        fetchScheduledPosts() // Refresh to show current state
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete posts')
    }
  }

  const handleBulkPause = async () => {
    if (selectedPosts.length === 0) return

    try {
      const pausePromises = selectedPosts.map(postId => 
        fetch('/api/posts/schedule', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, status: 'cancelled' })
        })
      )

      const results = await Promise.all(pausePromises)
      const failed = results.filter(r => !r.ok)

      if (failed.length === 0) {
        toast.success(`Successfully paused ${selectedPosts.length} post${selectedPosts.length > 1 ? 's' : ''}`)
        setSelectedPosts([])
        fetchScheduledPosts()
      } else {
        toast.error(`Failed to pause ${failed.length} post${failed.length > 1 ? 's' : ''}`)
        fetchScheduledPosts()
      }
    } catch (error) {
      console.error('Bulk pause error:', error)
      toast.error('Failed to pause posts')
    }
  }

  const handleBulkResume = async () => {
    if (selectedPosts.length === 0) return

    try {
      const resumePromises = selectedPosts.map(postId => 
        fetch('/api/posts/schedule', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, status: 'pending' })
        })
      )

      const results = await Promise.all(resumePromises)
      const failed = results.filter(r => !r.ok)

      if (failed.length === 0) {
        toast.success(`Successfully resumed ${selectedPosts.length} post${selectedPosts.length > 1 ? 's' : ''}`)
        setSelectedPosts([])
        fetchScheduledPosts()
      } else {
        toast.error(`Failed to resume ${failed.length} post${failed.length > 1 ? 's' : ''}`)
        fetchScheduledPosts()
      }
    } catch (error) {
      console.error('Bulk resume error:', error)
      toast.error('Failed to resume posts')
    }
  }

  const handleEditPost = (postId: string) => {
    // Navigate to create/new page with scheduledPostId parameter
    window.location.href = `/dashboard/create/new?scheduledPostId=${postId}`
  }

  const activePosts = scheduledPosts.filter(post => post.status === 'pending').length
  const pausedPosts = scheduledPosts.filter(post => post.status === 'cancelled').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-700'
      case 'cancelled': return 'bg-orange-100 text-orange-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'posting': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock
      case 'cancelled': return Pause
      case 'failed': return X
      case 'posting': return Send
      default: return Clock
    }
  }

  const getUrgencyColor = (timeUntil: string) => {
    if (timeUntil.includes('hour') && !timeUntil.includes('day')) {
      return 'text-red-600 font-medium'
    } else if (timeUntil.includes('1 day')) {
      return 'text-orange-600 font-medium'
    }
    return 'text-gray-600'
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
              <Clock className="h-8 w-8" />
            </div>
            Scheduled Posts
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Manage your upcoming social media posts</p>
        </div>
        <Link href="/dashboard/create/new">
          <Button variant="gradient" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Post
          </Button>
        </Link>
      </div>

      <SubscriptionGate feature="scheduled posts">
        <div className="space-y-8">
          {/* Search and Filter Bar */}
          <Card variant="elevated" className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-1 bg-purple-100 rounded-lg">
                  <Search className="h-4 w-4 text-purple-600" />
                </div>
                <Input
                  placeholder="Search scheduled posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-14 h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                />
              </div>
              <CustomSelect
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { value: 'all', label: 'All Posts' },
                  { value: 'active', label: 'Active' },
                  { value: 'paused', label: 'Paused' }
                ]}
                className="min-w-[150px]"
              />
              <Button onClick={processDuePosts} className="bg-green-600 hover:bg-green-700 h-12">
                <Send className="mr-2 h-4 w-4" />
                Process Due Posts
              </Button>
            </div>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Scheduled</p>
                    <p className="text-2xl font-bold">{filteredPosts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Play className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold">{activePosts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Pause className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Paused</p>
                    <p className="text-2xl font-bold">{pausedPosts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">This Week</p>
                    <p className="text-2xl font-bold">3</p>
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
                  <Button variant="outline" size="sm" onClick={handleBulkPause}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkResume}>
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts List */}
          <ScheduledPostsList
            posts={filteredPosts}
            selectedPosts={selectedPosts}
            onTogglePostSelection={togglePostSelection}
            onToggleAllPosts={toggleAllPosts}
            onPostNow={handlePostNow}
            onPausePost={handlePausePost}
            onResumePost={handleResumePost}
            onEditPost={handleEditPost}
            loading={loading}
          />
        </div>
      </SubscriptionGate>
    </div>
  )
}