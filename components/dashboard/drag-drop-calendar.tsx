'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core'
import {
  useDraggable,
  useDroppable
} from '@dnd-kit/core'

interface ScheduledPost {
  id: string
  content: string
  platforms: string[]
  scheduled_for: string
  status: 'pending' | 'posting' | 'posted' | 'failed' | 'cancelled'
  created_at: string
}

interface DragDropCalendarProps {
  scheduledPosts: ScheduledPost[]
  onPostUpdate: (postId: string, newDate: Date) => Promise<void>
  onPostEdit: (postId: string) => void
  onPostDelete: (postId: string) => void
}

interface DraggablePostProps {
  post: ScheduledPost
  onEdit: (postId: string) => void
  onDelete: (postId: string) => void
  isDragging?: boolean
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

function DraggablePost({ post, onEdit, onDelete, isDragging = false }: DraggablePostProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isBeingDragged
  } = useDraggable({
    id: post.id,
    data: {
      type: 'post',
      post
    }
  })

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

  // Don't apply transform to the actual element - let DragOverlay handle positioning
  const style = isBeingDragged ? { opacity: 0.4 } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group text-xs p-1 sm:p-2 rounded text-white cursor-grab active:cursor-grabbing transition-all hover:shadow-lg relative select-none",
        getPostColor(post),
        isDragging && "opacity-80"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate mb-0.5 text-[11px] sm:text-xs">
            {formatTime(post.scheduled_for)}
          </div>
          <div className="truncate opacity-90 text-[10px] sm:text-xs leading-relaxed hidden sm:block">
            {stripHtml(post.content).slice(0, 40)}...
          </div>
          <div className="flex items-center gap-0.5 mt-1 flex-wrap">
            {post.platforms.slice(0, 3).map(platform => (
              <span key={platform} className="text-[10px] bg-white/20 px-1 py-0.5 rounded">
                <span className="sm:hidden">{platformAbbreviations[platform] || platform.slice(0, 2).toUpperCase()}</span>
                <span className="hidden sm:inline">{platform}</span>
              </span>
            ))}
            {post.platforms.length > 3 && (
              <span className="text-[10px] bg-white/20 px-1 py-0.5 rounded">
                +{post.platforms.length - 3}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(post.id)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 hover:bg-white/20 rounded"
          >
            <Edit className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(post.id)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 hover:bg-white/20 rounded"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface DroppableCalendarDayProps {
  date: Date
  posts: ScheduledPost[]
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  onDateSelect: (date: Date) => void
  onEdit: (postId: string) => void
  onDelete: (postId: string) => void
}

function DroppableCalendarDay({ 
  date, 
  posts, 
  isCurrentMonth, 
  isToday, 
  isSelected, 
  onDateSelect,
  onEdit,
  onDelete 
}: DroppableCalendarDayProps) {
  const dayString = date.toISOString().split('T')[0]
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dayString}`,
    data: {
      type: 'day',
      date: dayString
    }
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-[140px] bg-white p-2 border-r border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all duration-200",
        !isCurrentMonth ? "bg-gray-50 text-gray-400" : "",
        isToday ? "ring-2 ring-primary ring-inset" : "",
        isSelected ? "bg-primary/10" : "",
        isOver ? "bg-blue-50 ring-2 ring-blue-300 ring-inset shadow-inner" : ""
      )}
      onClick={() => onDateSelect(date)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm">
          {date.getDate()}
        </div>
        {posts.length > 0 && (
          <div className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {posts.length}
          </div>
        )}
      </div>
      
      <div className="space-y-1.5">
        {posts.slice(0, 3).map((post) => (
          <DraggablePost
            key={post.id}
            post={post}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {posts.length > 3 && (
          <div className="text-xs text-gray-500 text-center py-1 bg-gray-100 rounded">
            +{posts.length - 3} more
          </div>
        )}
      </div>
    </div>
  )
}

export function DragDropCalendar({ 
  scheduledPosts, 
  onPostUpdate, 
  onPostEdit, 
  onPostDelete 
}: DragDropCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [draggedPost, setDraggedPost] = useState<ScheduledPost | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Get calendar days for the current month view
  const getDaysInMonth = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    const endDate = new Date(lastDay)

    // Adjust to show full weeks
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
    const dateString = date.toISOString().split('T')[0]
    return scheduledPosts
      .filter(post => {
        const postDate = new Date(post.scheduled_for).toISOString().split('T')[0]
        return postDate === dateString && post.status === 'pending'
      })
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const post = scheduledPosts.find(p => p.id === active.id)
    if (post) {
      setDraggedPost(post)
      // Add visual feedback
      document.body.style.cursor = 'grabbing'
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    // Reset cursor and clear dragged post
    document.body.style.cursor = ''
    setDraggedPost(null)
    
    if (!over || !active) {
      return
    }

    const overId = over.id as string
    const activeId = active.id as string

    // Check if dropping on a valid day
    if (overId.startsWith('day-') && over.data?.current?.type === 'day') {
      const targetDateString = overId.replace('day-', '')
      const targetDate = new Date(targetDateString + 'T00:00:00.000Z')
      
      const post = scheduledPosts.find(p => p.id === activeId)
      
      if (post) {
        const originalDateTime = new Date(post.scheduled_for)
        const newDateTime = new Date(targetDate)
        
        // Keep the same time, just change the date
        newDateTime.setUTCHours(originalDateTime.getUTCHours())
        newDateTime.setUTCMinutes(originalDateTime.getUTCMinutes())
        newDateTime.setUTCSeconds(0)
        newDateTime.setUTCMilliseconds(0)
        
        // Don't reschedule if dropping on the same date
        const originalDate = originalDateTime.toISOString().split('T')[0]
        const newDate = newDateTime.toISOString().split('T')[0]
        
        if (originalDate === newDate) {
          return
        }
        
        try {
          await onPostUpdate(post.id, newDateTime)
          toast.success('Post rescheduled successfully')
        } catch (error: any) {
          console.error('Reschedule error:', error)
          toast.error(error.message || 'Failed to reschedule post')
        }
      }
    }
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

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
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
                const dayString = date.toISOString().split('T')[0]
                
                return (
                  <DroppableCalendarDay
                    key={dayString}
                    date={date}
                    posts={posts}
                    isCurrentMonth={isCurrentMonth(date)}
                    isToday={isToday(date)}
                    isSelected={selectedDate?.toDateString() === date.toDateString()}
                    onDateSelect={setSelectedDate}
                    onEdit={onPostEdit}
                    onDelete={onPostDelete}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
        <DragOverlay
          style={{
            cursor: 'grabbing',
          }}
        >
          {draggedPost && (
            <div className="transform-none">
              <DraggablePost
                post={draggedPost}
                onEdit={() => {}}
                onDelete={() => {}}
                isDragging={true}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Drag and drop hint */}
      <div className="text-center text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
        💡 <strong>Tip:</strong> Drag and drop posts between calendar days to reschedule them instantly
      </div>
    </div>
  )
}