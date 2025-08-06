'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

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

const platformColors = {
  twitter: 'bg-blue-500',
  instagram: 'bg-pink-500',
  facebook: 'bg-blue-600',
  linkedin: 'bg-blue-700',
  youtube: 'bg-red-500',
  tiktok: 'bg-purple-500',
  threads: 'bg-gray-700',
  bluesky: 'bg-sky-500',
  pinterest: 'bg-red-600'
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch('/api/posts/schedule')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const data = await response.json()
      setScheduledPosts(data.posts || [])
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

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      return newDate
    })
  }

  const getDaysInMonth = () => {
    const days = []
    const current = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const getPostsForDate = (date: Date) => {
    return scheduledPosts.filter(post => {
      const postDate = new Date(post.scheduled_for)
      return postDate.getDate() === date.getDate() &&
             postDate.getMonth() === date.getMonth() &&
             postDate.getFullYear() === date.getFullYear()
    })
  }

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

  const getPostColor = (post: ScheduledPost) => {
    // Use first platform's color
    const primaryPlatform = post.platforms[0]
    return platformColors[primaryPlatform as keyof typeof platformColors] || 'bg-gray-500'
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const handleEditPost = (postId: string) => {
    window.location.href = `/dashboard/create/new?scheduledPostId=${postId}`
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-gray-600 mt-1">View and manage your scheduled posts</p>
        </div>
        <Link href="/dashboard/create/new">
          <Button className="mt-4 sm:mt-0">
            <Plus className="mr-2 h-4 w-4" />
            Schedule Post
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Week
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {/* Week day headers */}
            {weekDays.map(day => (
              <div
                key={day}
                className="bg-gray-50 p-3 text-center text-sm font-semibold text-gray-700"
              >
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {getDaysInMonth().map((date, index) => {
              const posts = getPostsForDate(date)
              const isCurrentMonthDay = isCurrentMonth(date)
              
              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[100px] bg-white p-2 cursor-pointer hover:bg-gray-50 transition-colors",
                    !isCurrentMonthDay ? "bg-gray-50 text-gray-400" : "",
                    isToday(date) ? "ring-2 ring-primary ring-inset" : "",
                    selectedDate?.getTime() === date.getTime() ? "bg-primary/10" : ""
                  )}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="font-semibold text-sm mb-1">
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {posts.slice(0, 2).map(post => (
                      <div
                        key={post.id}
                        className={cn(
                          "text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-80",
                          getPostColor(post)
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditPost(post.id)
                        }}
                      >
                        {formatTime(post.scheduled_for)} - {stripHtml(post.content).slice(0, 25)}...
                      </div>
                    ))}
                    {posts.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{posts.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              Posts for {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2 animate-spin" />
                <p className="text-gray-500">Loading posts...</p>
              </div>
            ) : getPostsForDate(selectedDate).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No posts scheduled for this date</p>
            ) : (
              <div className="space-y-3">
                {getPostsForDate(selectedDate).map(post => (
                  <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-1">{stripHtml(post.content).slice(0, 60)}...</h4>
                      <p className="text-sm text-gray-600 mt-1">{formatTime(post.scheduled_for)}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex gap-1">
                          {post.platforms.map(platform => (
                            <span key={platform} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {platform}
                            </span>
                          ))}
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          post.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                          post.status === 'posting' ? 'bg-yellow-100 text-yellow-700' :
                          post.status === 'cancelled' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditPost(post.id)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
