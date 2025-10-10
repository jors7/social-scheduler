'use client'

import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickScheduleOption {
  label: string
  icon: string
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
      icon: '⚡',
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
      icon: '🌅',
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
      icon: '☀️',
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
      icon: '🎉',
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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Quick Schedule</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {options.map((option) => {
          const selected = isSelected(option)

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onSelect(option.date, option.time)}
              className={cn(
                "relative p-3 rounded-lg border-2 transition-all text-left group",
                selected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              )}
            >
              <div className="flex flex-col gap-1">
                <span className="text-2xl">{option.icon}</span>
                <span className={cn(
                  "text-xs font-semibold",
                  selected ? "text-blue-700" : "text-gray-900"
                )}>
                  {option.label}
                </span>
                <span className={cn(
                  "text-[10px]",
                  selected ? "text-blue-600" : "text-gray-500"
                )}>
                  {option.description}
                </span>
              </div>

              {selected && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-500 italic">
        💡 Click any option to instantly set date & time
      </p>
    </div>
  )
}
