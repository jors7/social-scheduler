'use client'

import { Clock, Zap, Sunrise, Sun, CalendarCheck, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickScheduleOption {
  label: string
  icon: LucideIcon
  date: string // YYYY-MM-DD
  time: string // HH:MM
  description: string
}

interface QuickScheduleButtonsProps {
  onSelect: (date: string, time: string) => void
  currentDate?: string
  currentTime?: string
}

export function QuickScheduleButtons({
  onSelect,
  currentDate,
  currentTime
}: QuickScheduleButtonsProps) {
  const now = new Date()

  const getQuickOptions = (): QuickScheduleOption[] => {
    const options: QuickScheduleOption[] = []

    // In 1 hour
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000)
    options.push({
      label: 'In 1 Hour',
      icon: Zap,
      date: formatDate(in1Hour),
      time: formatTime(in1Hour),
      description: 'Quick post'
    })

    // Tomorrow 9 AM
    const tomorrow9AM = new Date(now)
    tomorrow9AM.setDate(tomorrow9AM.getDate() + 1)
    tomorrow9AM.setHours(9, 0, 0, 0)
    options.push({
      label: 'Tomorrow 9 AM',
      icon: Sunrise,
      date: formatDate(tomorrow9AM),
      time: formatTime(tomorrow9AM),
      description: 'Morning post'
    })

    // Tomorrow 12 PM
    const tomorrow12PM = new Date(now)
    tomorrow12PM.setDate(tomorrow12PM.getDate() + 1)
    tomorrow12PM.setHours(12, 0, 0, 0)
    options.push({
      label: 'Tomorrow Noon',
      icon: Sun,
      date: formatDate(tomorrow12PM),
      time: formatTime(tomorrow12PM),
      description: 'Lunch time'
    })

    // This Weekend (Saturday 10 AM)
    const thisWeekend = new Date(now)
    const daysUntilSaturday = (6 - now.getDay() + 7) % 7
    thisWeekend.setDate(thisWeekend.getDate() + (daysUntilSaturday || 7))
    thisWeekend.setHours(10, 0, 0, 0)
    options.push({
      label: 'This Weekend',
      icon: CalendarCheck,
      date: formatDate(thisWeekend),
      time: formatTime(thisWeekend),
      description: 'Saturday morning'
    })

    return options
  }

  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const isSelected = (option: QuickScheduleOption): boolean => {
    return currentDate === option.date && currentTime === option.time
  }

  const options = getQuickOptions()

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-gray-600" />
        <span className="text-xs font-medium text-gray-700">Quick Schedule</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {options.map((option) => {
          const selected = isSelected(option)
          const IconComponent = option.icon

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onSelect(option.date, option.time)}
              className={cn(
                "relative p-3 rounded-lg border-2 transition-all text-left group bg-white",
                selected
                  ? "border-blue-500 shadow-md"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
              )}
            >
              <div className="flex items-center gap-2">
                <IconComponent className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  selected ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
                )} />
                <span className={cn(
                  "text-[10px] font-semibold leading-tight",
                  selected ? "text-gray-900" : "text-gray-700"
                )}>
                  {option.label}
                </span>
              </div>

              {selected && (
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
