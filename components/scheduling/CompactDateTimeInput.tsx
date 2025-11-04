'use client'

import { useRef } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CompactDateTimeInputProps {
  date: string // YYYY-MM-DD
  time: string // HH:MM
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  onExpandClick?: () => void
  className?: string
}

export function CompactDateTimeInput({
  date,
  time,
  onDateChange,
  onTimeChange,
  onExpandClick,
  className
}: CompactDateTimeInputProps) {
  const timeInputRef = useRef<HTMLInputElement>(null)
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return 'Select date'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatDisplayTime = (timeStr: string): string => {
    if (!timeStr) return 'Select time'
    const [hours, minutes] = timeStr.split(':')
    const h = parseInt(hours, 10)
    const period = h >= 12 ? 'PM' : 'AM'
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${hour12}:${minutes} ${period}`
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2", className)}>
      {/* Date Input */}
      <div className="relative">
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          onClick={onExpandClick}
          className={cn(
            "pl-10 cursor-pointer",
            date ? "text-gray-900" : "text-gray-500"
          )}
        />
        <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
        {date && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-xs text-gray-500">{formatDisplayDate(date)}</span>
          </div>
        )}
      </div>

      {/* Time Input */}
      <div className="relative">
        <Input
          ref={timeInputRef}
          type="time"
          value={time}
          onChange={(e) => {
            onTimeChange(e.target.value)
            // Close the time picker dropdown after selection
            setTimeout(() => {
              timeInputRef.current?.blur()
            }, 100)
          }}
          onClick={onExpandClick}
          className={cn(
            "pl-10 cursor-pointer",
            time ? "text-gray-900" : "text-gray-500"
          )}
        />
        <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
        {time && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-xs text-gray-500">{formatDisplayTime(time)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
