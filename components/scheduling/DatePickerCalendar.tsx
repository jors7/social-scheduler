'use client'

import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ScheduledPost {
  date: string // YYYY-MM-DD format
  platforms: string[]
  count: number
}

interface DatePickerCalendarProps {
  value: string // YYYY-MM-DD format
  onChange: (date: string) => void
  scheduledPosts?: ScheduledPost[]
  label?: string
  minDate?: string // YYYY-MM-DD format
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const QUICK_DATES = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 Days', days: 3 },
  { label: 'Next Week', days: 7 },
  { label: 'In 2 Weeks', days: 14 },
]

export function DatePickerCalendar({
  value,
  onChange,
  scheduledPosts = [],
  label = 'Select Date',
  minDate
}: DatePickerCalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  }

  const parseDate = (dateStr: string): { year: number; month: number; day: number } => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return { year, month: month - 1, day }
  }

  const isToday = (year: number, month: number, day: number): boolean => {
    return (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate()
    )
  }

  const isSelected = (year: number, month: number, day: number): boolean => {
    if (!value) return false
    const { year: selectedYear, month: selectedMonth, day: selectedDay } = parseDate(value)
    return year === selectedYear && month === selectedMonth && day === selectedDay
  }

  const isWeekend = (dayOfWeek: number): boolean => {
    return dayOfWeek === 0 || dayOfWeek === 6
  }

  const getScheduledPostsForDate = (year: number, month: number, day: number): ScheduledPost | undefined => {
    const dateStr = formatDate(year, month, day)
    return scheduledPosts.find(post => post.date === dateStr)
  }

  const isPastDate = (year: number, month: number, day: number): boolean => {
    const date = new Date(year, month, day)
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return date < todayStart
  }

  const isBeforeMinDate = (year: number, month: number, day: number): boolean => {
    if (!minDate) return false
    const { year: minYear, month: minMonth, day: minDay } = parseDate(minDate)
    const date = new Date(year, month, day)
    const min = new Date(minYear, minMonth, minDay)
    return date < min
  }

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleQuickDate = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    const dateStr = formatDate(date.getFullYear(), date.getMonth(), date.getDate())
    onChange(dateStr)

    // Navigate to that month if needed
    if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) {
      setCurrentMonth(date.getMonth())
      setCurrentYear(date.getFullYear())
    }
  }

  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i)

  return (
    <div className="space-y-4">
      {/* Label */}
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        {label}
      </label>

      {/* Quick Date Buttons */}
      <div className="grid grid-cols-5 gap-2">
        {QUICK_DATES.map((qd) => {
          const quickDate = new Date()
          quickDate.setDate(quickDate.getDate() + qd.days)
          const quickDateStr = formatDate(quickDate.getFullYear(), quickDate.getMonth(), quickDate.getDate())
          const isSelected = value === quickDateStr

          return (
            <button
              key={qd.label}
              type="button"
              onClick={() => handleQuickDate(qd.days)}
              className={cn(
                "p-2 rounded-lg border-2 transition-all text-xs font-medium text-center",
                isSelected
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              )}
            >
              {qd.label}
            </button>
          )
        })}
      </div>

      {/* Calendar */}
      <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <div className="font-semibold text-gray-900">
              {MONTHS[currentMonth]} {currentYear}
            </div>
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_OF_WEEK.map((day, index) => (
            <div
              key={day}
              className={cn(
                "text-center text-xs font-semibold py-2",
                isWeekend(index) ? "text-blue-600" : "text-gray-600"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {emptyDays.map((i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Days */}
          {days.map((day) => {
            const dayOfWeek = new Date(currentYear, currentMonth, day).getDay()
            const scheduledPost = getScheduledPostsForDate(currentYear, currentMonth, day)
            const isTodayDate = isToday(currentYear, currentMonth, day)
            const isSelectedDate = isSelected(currentYear, currentMonth, day)
            const isPast = isPastDate(currentYear, currentMonth, day)
            const isDisabled = isPast || isBeforeMinDate(currentYear, currentMonth, day)

            return (
              <button
                key={day}
                type="button"
                onClick={() => !isDisabled && onChange(formatDate(currentYear, currentMonth, day))}
                disabled={isDisabled}
                className={cn(
                  "relative aspect-square rounded-lg text-sm font-medium transition-all",
                  "flex flex-col items-center justify-center",
                  isDisabled && "opacity-40 cursor-not-allowed",
                  !isDisabled && !isSelectedDate && "hover:bg-gray-100",
                  isSelectedDate && "bg-blue-500 text-white hover:bg-blue-600",
                  isTodayDate && !isSelectedDate && "border-2 border-blue-400",
                  isWeekend(dayOfWeek) && !isSelectedDate && !isDisabled && "bg-blue-50",
                  !isWeekend(dayOfWeek) && !isSelectedDate && !isDisabled && "bg-gray-50"
                )}
              >
                <span className="relative z-10">{day}</span>

                {/* Post indicators */}
                {scheduledPost && !isSelectedDate && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                    {scheduledPost.count > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    )}
                    {scheduledPost.count > 1 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    )}
                    {scheduledPost.count > 2 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-600 px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 border-2 border-blue-400 rounded" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-50 rounded" />
            <span>Weekend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span>Scheduled</span>
          </div>
        </div>
      </div>
    </div>
  )
}
