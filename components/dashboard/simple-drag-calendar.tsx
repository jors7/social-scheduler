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
  selectedPosts?: string[]
  onPostSelect?: (selectedPosts: string[]) => void
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
  onPostDelete,
  selectedPosts = [],
  onPostSelect
}: DragDropCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null)
  const [touchedPost, setTouchedPost] = useState<ScheduledPost | null>(null)
  const [modalTouchStart, setModalTouchStart] = useState<{ x: number; y: number; time: number; target: EventTarget } | null>(null)

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

  const isVideoUrl = (url: string | null): boolean => {
    if (!url) return false
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v']
    return videoExtensions.some(ext => url.toLowerCase().includes(ext))
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

      // Clean up drag state and close modal after successful update
      setIsDragging(false)
      // Use setTimeout to ensure state updates propagate before clearing selectedDate
      setTimeout(() => {
        setSelectedDate(null)
      }, 0)
    } catch (error: any) {
      console.error('Reschedule error:', error)
      toast.error(error.message || 'Failed to reschedule post')
      // Still clean up drag state on error
      setIsDragging(false)
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

  const togglePostSelection = (postId: string) => {
    if (!onPostSelect) return

    if (selectedPosts.includes(postId)) {
      onPostSelect(selectedPosts.filter(id => id !== postId))
    } else {
      onPostSelect([...selectedPosts, postId])
    }
  }

  const isPostSelected = (postId: string) => selectedPosts.includes(postId)

  // Touch event handlers for mobile drag-and-drop
  const handleTouchStart = (e: React.TouchEvent, postId: string, post: ScheduledPost) => {
    // Reset dragging state to ensure clean start for new touch interaction
    // This prevents race conditions from previous async state updates
    setIsDragging(false)

    const touch = e.touches[0]
    setTouchStartPos({ x: touch.clientX, y: touch.clientY })
    setTouchedPost(post)
    setDraggedPostId(postId)
    // Don't prevent default here - allow scrolling to work normally
    // preventDefault is called in handleTouchMove only when actually dragging
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchedPost || !touchStartPos) return

    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartPos.x)
    const deltaY = Math.abs(touch.clientY - touchStartPos.y)

    // Only trigger drag if user moved more than 10px (prevents accidental drags)
    if (deltaX > 10 || deltaY > 10) {
      setIsDragging(true)

      // Find which calendar day is under the finger
      const element = document.elementFromPoint(touch.clientX, touch.clientY)
      if (element) {
        // Find the closest calendar day cell
        const dayCell = element.closest('[data-date]')
        if (dayCell) {
          const dateString = dayCell.getAttribute('data-date')
          if (dateString) {
            setDragOverDate(dateString)
          }
        }
      }

      // Prevent scrolling while dragging
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchedPost) {
      return
    }

    if (!isDragging) {
      // If not dragging, it's a tap - reset states and allow click event
      setTouchStartPos(null)
      setTouchedPost(null)
      setDraggedPostId(null)
      setDragOverDate(null)
      return
    }

    // We were dragging - prevent the click event from firing
    e.preventDefault()

    const touch = e.changedTouches[0]
    const element = document.elementFromPoint(touch.clientX, touch.clientY)

    if (element) {
      // Find the closest calendar day cell
      const dayCell = element.closest('[data-date]')
      if (dayCell) {
        const dateString = dayCell.getAttribute('data-date')
        if (dateString) {
          // Parse the date string and reschedule the post
          const targetDate = new Date(dateString)
          const originalDateTime = new Date(touchedPost.scheduled_for)
          const newDateTime = new Date(targetDate)

          // Keep the same time, just change the date
          newDateTime.setHours(originalDateTime.getHours())
          newDateTime.setMinutes(originalDateTime.getMinutes())
          newDateTime.setSeconds(0)
          newDateTime.setMilliseconds(0)

          // Don't reschedule if dropping on the same date
          if (originalDateTime.toDateString() !== newDateTime.toDateString()) {
            onPostUpdate(touchedPost.id, newDateTime)
              .then(() => {
                toast.success('Post rescheduled successfully')
              })
              .catch((error: any) => {
                console.error('Reschedule error:', error)
                toast.error(error.message || 'Failed to reschedule post')
              })
          }
        }
      }
    }

    // Reset all touch states
    setTouchStartPos(null)
    setTouchedPost(null)
    setDraggedPostId(null)
    setDragOverDate(null)
    setIsDragging(false)
    // Keep modal open after drag so user can reschedule multiple posts
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <h2 className="text-lg sm:text-2xl font-bold">
            <span className="hidden sm:inline">{months[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
            <span className="sm:hidden">{months[currentDate.getMonth()].substring(0, 3)} {currentDate.getFullYear()}</span>
          </h2>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
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
                className="bg-gray-50 p-2 md:p-3 text-center text-xs md:text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0"
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}
          </div>

          {/* Calendar days - Scrollable on mobile */}
          <div className="grid grid-cols-7 md:grid-cols-7">
            {getDaysInMonth.map((date) => {
              const posts = getPostsForDate(date)
              const dateString = date.toISOString().split('T')[0]
              const isDragOver = dragOverDate === dateString
              
              return (
                <div
                  key={dateString}
                  data-date={dateString}
                  style={{ height: '140px' }}
                  className={cn(
                    "relative overflow-hidden bg-white p-1 sm:p-2 border-r border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
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
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                    <div className="font-semibold text-xs sm:text-sm">
                      {date.getDate()}
                    </div>
                    {posts.length > 0 && (
                      <div className={cn(
                        "text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full font-medium",
                        posts.length >= 3 ? "bg-purple-100 text-purple-700" :
                        posts.length === 2 ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {posts.length}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-0.5 sm:space-y-1">
                    {posts.slice(0, posts.length > 1 ? 1 : 1).map((post) => (
                        <div
                          key={post.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, post.id)}
                          onDragEnd={handleDragEnd}
                          onTouchStart={(e) => handleTouchStart(e, post.id, post)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          onClick={(e) => {
                            // Clicking the post card opens modal on both desktop and mobile
                            e.stopPropagation()
                            setSelectedDate(date)
                          }}
                          className={cn(
                            "group text-xs px-1 sm:px-1.5 py-0.5 sm:py-1 rounded text-white cursor-move transition-all hover:shadow-md",
                            getPostColor(post),
                            draggedPostId === post.id ? "opacity-50" : "",
                            isPostSelected(post.id) ? "ring-2 ring-blue-400 ring-offset-1" : ""
                          )}
                      >
                        <div className="flex items-start justify-between gap-0.5 sm:gap-1">
                          {onPostSelect && (
                            <input
                              type="checkbox"
                              checked={isPostSelected(post.id)}
                              onChange={(e) => {
                                e.stopPropagation()
                                togglePostSelection(post.id)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="hidden sm:block flex-shrink-0 mt-0.5 h-3 w-3 rounded border-white/50 cursor-pointer"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[10px] sm:text-[11px]">
                              {formatTime(post.scheduled_for)}
                            </div>
                            <div className="hidden sm:block truncate opacity-90 text-[10px] leading-tight">
                              {post.platforms?.includes('pinterest') && post.pinterest_title
                                ? post.pinterest_title
                                : stripHtml(post.content).slice(0, 35) + '...'}
                            </div>
                            <div className="hidden sm:block text-[9px] opacity-75 mt-0.5">
                              {post.platforms.join(' · ')}
                            </div>
                            {/* Mobile: Show only first platform initial */}
                            <div className="sm:hidden text-[8px] opacity-75">
                              {post.platforms[0].substring(0, 2).toUpperCase()}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              // On mobile, open modal first. On desktop, edit directly.
                              const isMobile = window.matchMedia('(max-width: 640px)').matches
                              if (isMobile) {
                                setSelectedDate(date)
                              } else {
                                onPostEdit(post.id)
                              }
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
                        className="w-full text-[8px] sm:text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded text-center font-medium mt-0.5 sm:mt-1 py-0.5 transition-colors"
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
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 animate-in fade-in duration-300"
          onTouchStart={(e) => {
            // Track touch start for scroll detection (mobile only)
            const touch = e.touches[0]
            setModalTouchStart({
              x: touch.clientX,
              y: touch.clientY,
              time: Date.now(),
              target: e.target
            })
          }}
          onTouchEnd={(e) => {
            // Only close if it was a tap on backdrop, not a scroll (mobile only)
            if (!modalTouchStart) return

            const touch = e.changedTouches[0]
            const deltaX = Math.abs(touch.clientX - modalTouchStart.x)
            const deltaY = Math.abs(touch.clientY - modalTouchStart.y)
            const deltaTime = Date.now() - modalTouchStart.time

            // Check if user touched the backdrop element
            const backdropElement = e.currentTarget.querySelector('.absolute.inset-0')
            const touchedBackdrop = modalTouchStart.target === backdropElement ||
                                    (modalTouchStart.target as HTMLElement).classList?.contains('backdrop-blur-sm')

            // Consider it a tap (should close) if:
            // - User touched the backdrop (not modal content)
            // - Movement is less than 10px in both directions
            // - Touch duration is less than 300ms
            const isTap = touchedBackdrop && deltaX < 10 && deltaY < 10 && deltaTime < 300

            if (isTap) {
              setSelectedDate(null)
            }

            setModalTouchStart(null)
          }}
        >
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedDate(null)}
          />
          <Card
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border-gray-200 shadow-xl animate-in fade-in zoom-in-95 duration-300 mt-16"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">
                    Posts for {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </CardTitle>
                  {onPostSelect && getPostsForDate(selectedDate).length > 0 && (
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={getPostsForDate(selectedDate).every(post => isPostSelected(post.id))}
                        onChange={(e) => {
                          const posts = getPostsForDate(selectedDate)
                          if (e.target.checked) {
                            const newSelected = [...selectedPosts]
                            posts.forEach(post => {
                              if (!newSelected.includes(post.id)) {
                                newSelected.push(post.id)
                              }
                            })
                            onPostSelect(newSelected)
                          } else {
                            const postIds = posts.map(p => p.id)
                            onPostSelect(selectedPosts.filter(id => !postIds.includes(id)))
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                      />
                      Select All
                    </label>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto p-4 sm:p-6 flex-1 min-h-0">
                <div className="space-y-4 px-1">
                  {getPostsForDate(selectedDate).map((post) => {
                  const mediaUrl = getMediaUrl(post)
                  const primaryPlatform = post.platforms[0]
                  const platformIcon = platformIcons[primaryPlatform] || '📝'

                  const isVideo = isVideoUrl(mediaUrl)

                  return (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, post.id)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, post.id, post)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={cn(
                        "group p-2 sm:p-4 rounded-lg text-white cursor-move transition-all hover:shadow-lg",
                        getPostColor(post),
                        draggedPostId === post.id ? "opacity-50" : "",
                        isPostSelected(post.id) ? "ring-2 ring-blue-400 ring-offset-2" : ""
                      )}
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                        {/* Mobile: Checkbox and Media row */}
                        <div className="flex sm:hidden items-center gap-3 w-full">
                          {/* Checkbox */}
                          {onPostSelect && (
                            <div className="flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={isPostSelected(post.id)}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  togglePostSelection(post.id)
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 rounded border-white/50 cursor-pointer"
                              />
                            </div>
                          )}

                          {/* Media thumbnail or platform icon */}
                          <div className="flex-shrink-0">
                            {mediaUrl && !isVideo && (
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
                            )}
                            {mediaUrl && isVideo && (
                              <video
                                src={mediaUrl}
                                className="w-16 h-16 object-cover rounded-lg border-2 border-white/20"
                                muted
                                playsInline
                                onError={(e) => {
                                  const target = e.target as HTMLVideoElement
                                  target.style.display = 'none'
                                  const fallback = target.nextElementSibling
                                  if (fallback) {
                                    (fallback as HTMLElement).style.display = 'flex'
                                  }
                                }}
                              />
                            )}
                            <div
                              className={cn(
                                "w-16 h-16 rounded-lg flex items-center justify-center text-2xl bg-white/10 border-2 border-white/20",
                                mediaUrl ? "hidden" : ""
                              )}
                            >
                              {platformIcon}
                            </div>
                          </div>

                          {/* Time on mobile */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium text-sm">
                                {formatTime(post.scheduled_for)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Desktop: Checkbox */}
                        {onPostSelect && (
                          <div className="hidden sm:block flex-shrink-0 pt-1">
                            <input
                              type="checkbox"
                              checked={isPostSelected(post.id)}
                              onChange={(e) => {
                                e.stopPropagation()
                                togglePostSelection(post.id)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-white/50 cursor-pointer"
                            />
                          </div>
                        )}

                        {/* Desktop: Media thumbnail or platform icon */}
                        <div className="hidden sm:block flex-shrink-0">
                          {mediaUrl && !isVideo && (
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
                          )}
                          {mediaUrl && isVideo && (
                            <video
                              src={mediaUrl}
                              className="w-16 h-16 object-cover rounded-lg border-2 border-white/20"
                              muted
                              playsInline
                              onError={(e) => {
                                const target = e.target as HTMLVideoElement
                                target.style.display = 'none'
                                const fallback = target.nextElementSibling
                                if (fallback) {
                                  (fallback as HTMLElement).style.display = 'flex'
                                }
                              }}
                            />
                          )}
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
                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                            <div className="flex-1 w-full">
                              {/* Desktop: Time */}
                              <div className="hidden sm:flex items-center gap-2 mb-2">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">
                                  {formatTime(post.scheduled_for)}
                                </span>
                              </div>
                              {/* Post content */}
                              <div className="text-xs sm:text-sm opacity-90 mb-2">
                                {Array.isArray(post.platforms) && post.platforms.includes('pinterest') && post.pinterest_title
                                  ? post.pinterest_title
                                  : stripHtml(post.content).slice(0, 150) + '...'}
                              </div>
                              {/* Platform badges */}
                              <div className="flex flex-wrap gap-1">
                                {(Array.isArray(post.platforms) ? post.platforms : []).map(platform => (
                                  <span
                                    key={platform}
                                    className="text-xs bg-white/20 px-2 py-1 rounded"
                                  >
                                    {platform}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {/* Action buttons - stack vertically on mobile, side by side on desktop */}
                            <div className="flex sm:flex-col gap-2 w-full sm:w-auto sm:ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 sm:flex-initial hover:bg-white/20 text-white"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedDate(null)
                                  onPostEdit(post.id)
                                }}
                              >
                                <Edit className="h-4 w-4 sm:mr-0 mr-2" />
                                <span className="sm:hidden">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 sm:flex-initial hover:bg-white/20 text-white"
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
                                <Trash2 className="h-4 w-4 sm:mr-0 mr-2" />
                                <span className="sm:hidden">Delete</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>
              </div>
              {/* Hint text - always visible at bottom, not scrollable */}
              <div className="border-t border-gray-200 p-3 sm:p-4 text-xs sm:text-sm text-gray-600 text-center bg-gray-50">
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