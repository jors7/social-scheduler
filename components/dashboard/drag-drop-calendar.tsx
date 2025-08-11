'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus, Edit, Clock, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

function DraggablePost({ post, onEdit, onDelete }: DraggablePostProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: post.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group text-xs p-2 rounded text-white cursor-grab active:cursor-grabbing transition-all hover:shadow-lg",
        getPostColor(post),
        isDragging && "opacity-50 shadow-xl scale-105"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate mb-1">
            {formatTime(post.scheduled_for)}
          </div>
          <div className="truncate opacity-90 text-xs leading-relaxed">
            {stripHtml(post.content).slice(0, 40)}...
          </div>
          <div className="flex items-center gap-1 mt-1">
            {post.platforms.slice(0, 3).map(platform => (
              <span key={platform} className="text-[10px] bg-white/20 px-1 py-0.5 rounded">
                {platform}
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
              e.preventDefault()
              onEdit(post.id)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 hover:bg-white/20 rounded z-10"
            style={{ pointerEvents: 'auto' }}
          >
            <Edit className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onDelete(post.id)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 hover:bg-white/20 rounded z-10"
            style={{ pointerEvents: 'auto' }}
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
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[140px] bg-white p-2 border-r border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
        !isCurrentMonth ? "bg-gray-50 text-gray-400" : "",
        isToday ? "ring-2 ring-primary ring-inset" : "",
        isSelected ? "bg-primary/10" : "",
        isOver ? "bg-blue-50 ring-2 ring-blue-300 ring-inset" : ""
      )}
      onClick={() => onDateSelect(date)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm">
          {date.getDate()}
        </div>
        {posts.length > 0 && (
          <div className="text-xs text-gray-500">
            {posts.length}
          </div>
        )}
      </div>
      
      <div className="space-y-1 overflow-y-auto max-h-[100px]">
        {posts.slice(0, 3).map(post => (
          <DraggablePost
            key={post.id}
            post={post}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {posts.length > 3 && (
          <div className="text-xs text-gray-500 text-center py-1">
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
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
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
    return scheduledPosts.filter(post => {
      const postDate = new Date(post.scheduled_for).toISOString().split('T')[0]
      return postDate === dateString && post.status === 'pending'
    }).sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
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
    const post = scheduledPosts.find(p => p.id === event.active.id)
    setDraggedPost(post || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log('Drag end:', { active: active?.id, over: over?.id })
    
    if (!over || !active) {
      setDraggedPost(null)
      return
    }

    // Check if we're dropping on a calendar day
    const overId = over.id as string
    const activeId = active.id as string

    console.log('Processing drop:', { overId, activeId })

    if (overId.startsWith('day-')) {
      const targetDateString = overId.replace('day-', '')
      const targetDate = new Date(targetDateString + 'T12:00:00')
      
      console.log('Target date:', targetDate)
      
      const post = scheduledPosts.find(p => p.id === activeId)
      if (post) {
        // Keep the same time but change the date
        const originalTime = new Date(post.scheduled_for)
        const newDateTime = new Date(targetDate)
        newDateTime.setHours(originalTime.getHours())
        newDateTime.setMinutes(originalTime.getMinutes())
        
        console.log('Rescheduling from:', originalTime, 'to:', newDateTime)
        
        try {
          await onPostUpdate(activeId, newDateTime)
          toast.success('Post rescheduled successfully')
        } catch (error) {
          console.error('Reschedule error:', error)
          toast.error('Failed to reschedule post')
        }
      }
    }
    
    setDraggedPost(null)
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
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={scheduledPosts.map(p => p.id)} strategy={verticalListSortingStrategy}>
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
                {getDaysInMonth.map((date, index) => {
                  const posts = getPostsForDate(date)
                  const dayString = date.toISOString().split('T')[0]
                  
                  return (
                    <div key={index} id={`day-${dayString}`}>
                      <DroppableCalendarDay
                        date={date}
                        posts={posts}
                        isCurrentMonth={isCurrentMonth(date)}
                        isToday={isToday(date)}
                        isSelected={selectedDate?.getTime() === date.getTime()}
                        onDateSelect={setSelectedDate}
                        onEdit={onPostEdit}
                        onDelete={onPostDelete}
                      />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </SortableContext>

        <DragOverlay>
          {draggedPost && (
            <div className="transform rotate-2 shadow-2xl">
              <DraggablePost
                post={draggedPost}
                onEdit={() => {}}
                onDelete={() => {}}
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