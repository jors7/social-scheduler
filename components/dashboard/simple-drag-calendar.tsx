'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Edit, Trash2, X, Clock, Image, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ScheduledPost {
  id: string
  content: string
  platforms: string[]
  media_urls?: any[] | string
  scheduled_for: string
  status: 'pending' | 'posting' | 'posted' | 'failed' | 'cancelled'
  created_at: string
  pinterest_title?: string
  pinterest_description?: string
}

interface DragDropCalendarProps {
  scheduledPosts: ScheduledPost[]
  onPostUpdate: (postId: string, newDate: Date) => Promise<void>
  onPostEdit: (postId: string) => void
  onPostDelete: (postId: string) => void
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

const platformAbbreviations: Record<string, string> = {
  twitter: 'X',
  instagram: 'IG',
  facebook: 'FB',
  linkedin: 'LI',
  youtube: 'YT',
  tiktok: 'TT',
  threads: 'TH',
  bluesky: 'BS',
  pinterest: 'PI'
}

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  x: '𝕏',
  instagram: '📷',
  facebook: '📘',
  linkedin: '💼',
  youtube: '📺',
  tiktok: '🎵',
  threads: '🧵',
  bluesky: '☁️',
  pinterest: '📌'
}

export function SimpleDragCalendar({ 
  scheduledPosts, 
  onPostUpdate, 
  onPostEdit, 
  onPostDelete 
}: DragDropCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const getDaysInMonth = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    const endDate = new Date(lastDay)

    startDate.setDate(startDate.getDate() - startDate.getDay())
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

    const days = []
    const currentDay = new Date(startDate)
    
    while (currentDay <= endDate) {
      days.push(new Date(currentDay))
      currentDay.setDate(currentDay.getDate() + 1)
    }
    
    return days
  }, [currentDate])

  const getPostsForDate = (date: Date) => {
    // Use local date string to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    return scheduledPosts
      .filter(post => {
        const postDate = new Date(post.scheduled_for)
        const postYear = postDate.getFullYear()
        const postMonth = String(postDate.getMonth() + 1).padStart(2, '0')
        const postDay = String(postDate.getDate()).padStart(2, '0')
        const postDateString = `${postYear}-${postMonth}-${postDay}`
        
        return postDateString === dateString && post.status === 'pending'
      })
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getPostColor = (post: ScheduledPost) => {
    const primaryPlatform = post.platforms[0] as keyof typeof platformColors
    return platformColors[primaryPlatform] || 'bg-gray-500'
  }

  const getMediaUrl = (post: ScheduledPost): string | null => {
    // Check the media_urls field
    if (post.media_urls) {
      // Handle different possible formats of media_urls
      if (Array.isArray(post.media_urls) && post.media_urls.length > 0) {
        const firstMedia = post.media_urls[0]

        // If it's a string URL, return it directly
        if (typeof firstMedia === 'string' && firstMedia.trim() !== '') {
          return firstMedia.trim()
        }

        // If it's an object, try to extract the URL from various possible properties
        if (firstMedia && typeof firstMedia === 'object') {
          // Check for various possible property names
          if (firstMedia.url && typeof firstMedia.url === 'string') return firstMedia.url.trim()
          if (firstMedia.media_url && typeof firstMedia.media_url === 'string') return firstMedia.media_url.trim()
          if (firstMedia.src && typeof firstMedia.src === 'string') return firstMedia.src.trim()
          if (firstMedia.secure_url && typeof firstMedia.secure_url === 'string') return firstMedia.secure_url.trim()
        }
      }

      // If media_urls is a single string
      if (typeof post.media_urls === 'string' && post.media_urls.trim() !== '') {
        return post.media_urls.trim()
      }
    }

    return null
  }

  const handleDragStart = (e: React.DragEvent, postId: string) => {
    setDraggedPostId(postId)
    // Only set dragging to true after mouse actually moves
    setTimeout(() => {
      setIsDragging(true)
    }, 150)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', postId)
  }

  const handleDragEnd = () => {
    setDraggedPostId(null)
    setDragOverDate(null)
    setIsDragging(false)
    // Modal will reappear after drag ends if it was open before
  }

  const handleDragOver = (e: React.DragEvent, dateString: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(dateString)
  }

  const handleDragLeave = () => {
    setDragOverDate(null)
  }

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    const postId = e.dataTransfer.getData('text/plain')
    
    setDragOverDate(null)
    setDraggedPostId(null)

    if (!postId) {
      console.log('No postId in drag data')
      return
    }

    const post = scheduledPosts.find(p => p.id === postId)
    if (!post) {
      console.log('Post not found:', postId)
      return
    }

    const originalDateTime = new Date(post.scheduled_for)
    const newDateTime = new Date(targetDate)
    
    // Keep the same time, just change the date
    newDateTime.setHours(originalDateTime.getHours())
    newDateTime.setMinutes(originalDateTime.getMinutes())
    newDateTime.setSeconds(0)
    newDateTime.setMilliseconds(0)
    
    console.log('Drag and drop details:', {
      originalDate: originalDateTime.toISOString(),
      newDate: newDateTime.toISOString(),
      isSameDate: originalDateTime.toDateString() === newDateTime.toDateString()
    })
    
    // Don't reschedule if dropping on the same date
    if (originalDateTime.toDateString() === newDateTime.toDateString()) {
      console.log('Same date, not updating')
      return
    }
    
    try {
      console.log('Calling onPostUpdate with:', post.id, newDateTime.toISOString())
      await onPostUpdate(post.id, newDateTime)
      toast.success('Post rescheduled successfully')
    } catch (error: any) {
      console.error('Reschedule error:', error)
      toast.error(error.message || 'Failed to reschedule post')
    }
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      return newDate
    })
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {weekDays.map(day => (
              <div
                key={day}
                className="bg-gray-50 p-3 text-center text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {getDaysInMonth.map((date) => {
              const posts = getPostsForDate(date)
              const dateString = date.toISOString().split('T')[0]
              const isDragOver = dragOverDate === dateString
              
              return (
                <div
                  key={dateString}
                  style={{ height: '140px' }}
                  className={cn(
                    "relative overflow-hidden bg-white p-2 border-r border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
                    !isCurrentMonth(date) ? "bg-gray-50 text-gray-400" : "",
                    isToday(date) ? "ring-2 ring-primary ring-inset" : "",
                    selectedDate?.toDateString() === date.toDateString() ? "bg-primary/10" : "",
                    isDragOver ? "bg-blue-50 ring-2 ring-blue-400" : "",
                    posts.length > 2 ? "bg-gradient-to-br from-white via-white to-purple-50" : ""
                  )}
                  onDragOver={(e) => handleDragOver(e, dateString)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, date)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-sm">
                      {date.getDate()}
                    </div>
                    {posts.length > 0 && (
                      <div className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full font-medium",
                        posts.length >= 3 ? "bg-purple-100 text-purple-700" :
                        posts.length === 2 ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {posts.length}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {posts.slice(0, posts.length > 1 ? 1 : 1).map((post) => (
                        <div
                          key={post.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, post.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "group text-xs px-1.5 py-1 rounded text-white cursor-move transition-all hover:shadow-md",
                            getPostColor(post),
                            draggedPostId === post.id ? "opacity-50" : ""
                          )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[11px]">
                              {formatTime(post.scheduled_for)}
                            </div>
                            <div className="truncate opacity-90 text-[10px] leading-tight">
                              {post.platforms?.includes('pinterest') && post.pinterest_title
                                ? post.pinterest_title
                                : stripHtml(post.content).slice(0, 35) + '...'}
                            </div>
                            <div className="text-[9px] opacity-75 mt-0.5">
                              {post.platforms.join(' · ')}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              onPostEdit(post.id)
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 rounded p-0.5 flex-shrink-0"
                            title="Edit post"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {posts.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDate(date)
                        }}
                        className="w-full text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded text-center font-medium mt-1 py-0.5 transition-colors"
                      >
                        +{posts.length - 1} more
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Modal */}
      {selectedDate && getPostsForDate(selectedDate).length > 0 && !isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedDate(null)}
          />
          <Card className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Posts for {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto max-h-[calc(80vh-4rem)]">
              <div className="space-y-3">
                {getPostsForDate(selectedDate).map((post) => {
                  const mediaUrl = getMediaUrl(post)
                  const primaryPlatform = post.platforms[0]
                  const platformIcon = platformIcons[primaryPlatform] || '📝'

                  return (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, post.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "group p-4 rounded-lg text-white cursor-move transition-all hover:shadow-lg",
                        getPostColor(post),
                        draggedPostId === post.id ? "opacity-50" : ""
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Media thumbnail or platform icon */}
                        <div className="flex-shrink-0">
                          {mediaUrl ? (
                            <img
                              src={mediaUrl}
                              alt="Post media"
                              className="w-16 h-16 object-cover rounded-lg border-2 border-white/20"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const fallback = target.nextElementSibling
                                if (fallback) {
                                  (fallback as HTMLElement).style.display = 'flex'
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className={cn(
                              "w-16 h-16 rounded-lg flex items-center justify-center text-2xl bg-white/10 border-2 border-white/20",
                              mediaUrl ? "hidden" : ""
                            )}
                          >
                            {platformIcon}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">
                                  {formatTime(post.scheduled_for)}
                                </span>
                              </div>
                              <div className="text-sm opacity-90 mb-2">
                                {post.platforms?.includes('pinterest') && post.pinterest_title
                                  ? post.pinterest_title
                                  : stripHtml(post.content).slice(0, 150) + '...'}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {post.platforms.map(platform => (
                                  <span
                                    key={platform}
                                    className="text-xs bg-white/20 px-2 py-1 rounded"
                                  >
                                    {platform}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="hover:bg-white/20 text-white"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedDate(null)
                                  onPostEdit(post.id)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="hover:bg-white/20 text-white"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (confirm('Are you sure you want to delete this post?')) {
                                    onPostDelete(post.id)
                                    // Refresh the modal if still open
                                    if (getPostsForDate(selectedDate).length === 1) {
                                      setSelectedDate(null)
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 text-xs text-gray-500 text-center">
                💡 Drag posts from here to any calendar day to reschedule
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drag and drop hint */}
      <div className="text-center text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
        💡 <strong>Tip:</strong> Drag and drop posts between calendar days to reschedule them instantly
      </div>
    </div>
  )
}