'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react'
import Link from 'next/link'

const mockPosts = [
  {
    id: 1,
    title: 'Product Launch Announcement',
    platforms: ['twitter', 'facebook', 'linkedin'],
    time: '10:00 AM',
    date: new Date(2024, 0, 20),
    color: 'bg-blue-500'
  },
  {
    id: 2,
    title: 'Weekly Tips Thread',
    platforms: ['twitter', 'instagram'],
    time: '2:00 PM',
    date: new Date(2024, 0, 20),
    color: 'bg-green-500'
  },
  {
    id: 3,
    title: 'Customer Spotlight',
    platforms: ['linkedin'],
    time: '11:30 AM',
    date: new Date(2024, 0, 22),
    color: 'bg-purple-500'
  },
  {
    id: 4,
    title: 'Behind the Scenes',
    platforms: ['instagram', 'tiktok'],
    time: '4:00 PM',
    date: new Date(2024, 0, 25),
    color: 'bg-pink-500'
  },
]

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

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
    return mockPosts.filter(post => 
      post.date.getDate() === date.getDate() &&
      post.date.getMonth() === date.getMonth() &&
      post.date.getFullYear() === date.getFullYear()
    )
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
                          "text-xs p-1 rounded text-white truncate",
                          post.color
                        )}
                      >
                        {post.time} - {post.title}
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
            {getPostsForDate(selectedDate).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No posts scheduled for this date</p>
            ) : (
              <div className="space-y-3">
                {getPostsForDate(selectedDate).map(post => (
                  <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{post.title}</h4>
                      <p className="text-sm text-gray-600">{post.time}</p>
                      <div className="flex gap-2 mt-2">
                        {post.platforms.map(platform => (
                          <span key={platform} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
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

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}