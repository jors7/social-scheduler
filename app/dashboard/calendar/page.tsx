'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Clock, Calendar, Search, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SimpleDragCalendar } from '@/components/dashboard/simple-drag-calendar'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'
import { CustomSelect } from '@/components/ui/custom-select'

interface ScheduledPost {
  id: string
  content: string
  platforms: string[]
  platform_content: Record<string, string>
  media_urls: string[]
  scheduled_for: string
  status: 'pending' | 'posting' | 'posted' | 'failed' | 'cancelled'
  created_at: string
  pinterest_title?: string
  pinterest_description?: string
}

export default function CalendarPage() {
  const router = useRouter()
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch('/api/posts/schedule')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const data = await response.json()
      const posts = data.posts || []

      setScheduledPosts(posts)
    } catch (error) {
      console.error('Error fetching scheduled posts:', error)
      toast.error('Failed to load scheduled posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScheduledPosts()
  }, [])

  const handlePostUpdate = async (postId: string, newDate: Date) => {
    try {
      const response = await fetch(`/api/posts/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: postId,
          scheduledFor: newDate.toISOString()
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('Server error response:', errorData)
        console.error('Full error details:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        })
        throw new Error(errorData?.error || 'Failed to update post')
      }

      // Refresh posts
      fetchScheduledPosts()
    } catch (error) {
      console.error('Error updating post:', error)
      throw error
    }
  }

  const handleEditPost = (postId: string) => {
    router.push(`/dashboard/create/new?scheduledPostId=${postId}`)
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return
    }

    try {
      const response = await fetch(`/api/posts/schedule?id=${postId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete post')
      }

      toast.success('Post deleted successfully')
      setSelectedPosts(prev => prev.filter(id => id !== postId))
      fetchScheduledPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Failed to delete post')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPosts.length === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedPosts.length} post${selectedPosts.length > 1 ? 's' : ''}?`)) {
      return
    }

    try {
      const deletePromises = selectedPosts.map(postId =>
        fetch(`/api/posts/schedule?id=${postId}`, { method: 'DELETE' })
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

  // Filter posts based on search query, platform, and status
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

  const filteredPosts = scheduledPosts.filter(post => {
    // Search filter
    if (searchQuery) {
      const content = stripHtml(post.content).toLowerCase()
      const platforms = post.platforms.join(' ').toLowerCase()
      const query = searchQuery.toLowerCase()
      if (!content.includes(query) && !platforms.includes(query)) {
        return false
      }
    }

    // Platform filter
    if (platformFilter.length > 0) {
      const hasMatchingPlatform = post.platforms.some(p => platformFilter.includes(p))
      if (!hasMatchingPlatform) return false
    }

    // Status filter
    if (statusFilter !== 'all' && post.status !== statusFilter) {
      return false
    }

    return true
  })

  const hasActiveFilters = searchQuery || platformFilter.length > 0 || statusFilter !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setPlatformFilter([])
    setStatusFilter('all')
  }

  const availablePlatforms = Array.from(new Set(scheduledPosts.flatMap(p => p.platforms)))

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
                <Calendar className="h-8 w-8" />
              </div>
              Calendar
            </h1>
            <p className="text-gray-600 mt-2 text-lg">View and manage your scheduled posts</p>
          </div>
        </div>
        <Card variant="elevated">
          <CardContent className="text-center py-16 bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-fit mx-auto mb-6">
              <Clock className="h-12 w-12 text-white animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading calendar...</h3>
            <p className="text-gray-600">Please wait while we fetch your scheduled posts</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
              <Calendar className="h-8 w-8" />
            </div>
            Calendar
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Drag and drop posts to reschedule them instantly</p>
        </div>
        <Link href="/dashboard/create/new">
          <Button variant="gradient" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Post
          </Button>
        </Link>
      </div>

      <SubscriptionGate feature="calendar scheduling">
        {/* Search and Filter Bar */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search posts by content or platform..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'posting', label: 'Posting' },
                { value: 'posted', label: 'Posted' },
                { value: 'failed', label: 'Failed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
              className="min-w-[150px] h-10"
            />

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="h-10">
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Filter Result Count */}
          {hasActiveFilters && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredPosts.length} of {scheduledPosts.length} posts
            </div>
          )}
        </Card>

        <Card variant="glass" className="p-6 min-h-[600px]">
          <SimpleDragCalendar
            scheduledPosts={filteredPosts}
            onPostUpdate={handlePostUpdate}
            onPostEdit={handleEditPost}
            onPostDelete={handleDeletePost}
            selectedPosts={selectedPosts}
            onPostSelect={setSelectedPosts}
          />
        </Card>

        {/* Bulk Actions Bar */}
        {selectedPosts.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <Card className="shadow-2xl border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="flex items-center gap-4 py-4 px-6">
                <span className="text-sm font-medium text-purple-900">
                  {selectedPosts.length} post{selectedPosts.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="hover:bg-red-50 hover:border-red-300"
                  >
                    Delete Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPosts([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </SubscriptionGate>
    </div>
  )
}