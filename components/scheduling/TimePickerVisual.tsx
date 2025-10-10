'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface TimePickerVisualProps {
  value: string // HH:MM format
  onChange: (time: string) => void
  optimalTimes?: string[] // Array of optimal times in HH:MM format
  label?: string
  timezone?: string
}

const QUICK_TIMES = [
  { label: 'Morning', time: '09:00', icon: '🌅' },
  { label: 'Noon', time: '12:00', icon: '☀️' },
  { label: 'Afternoon', time: '15:00', icon: '🌤️' },
  { label: 'Evening', time: '18:00', icon: '🌆' },
  { label: 'Night', time: '21:00', icon: '🌙' },
]

export function TimePickerVisual({
  value,
  onChange,
  optimalTimes = [],
  label = 'Select Time',
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
}: TimePickerVisualProps) {
  const [hour, setHour] = useState('12')
  const [minute, setMinute] = useState('00')
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM')

  // Parse value into hour, minute, period
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':')
      const hourNum = parseInt(h, 10)
      setHour(hourNum === 0 ? '12' : hourNum > 12 ? String(hourNum - 12) : String(hourNum))
      setMinute(m)
      setPeriod(hourNum >= 12 ? 'PM' : 'AM')
    }
  }, [value])

  // Convert 12-hour to 24-hour format
  const to24Hour = (h: string, p: 'AM' | 'PM'): string => {
    let hour24 = parseInt(h, 10)
    if (p === 'PM' && hour24 !== 12) hour24 += 12
    if (p === 'AM' && hour24 === 12) hour24 = 0
    return hour24.toString().padStart(2, '0')
  }

  const handleTimeChange = (newHour?: string, newMinute?: string, newPeriod?: 'AM' | 'PM') => {
    const h = newHour || hour
    const m = newMinute || minute
    const p = newPeriod || period
    const hour24 = to24Hour(h, p)
    onChange(`${hour24}:${m}`)
  }

  const handleQuickTime = (time: string) => {
    const [h, m] = time.split(':')
    const hourNum = parseInt(h, 10)
    const newPeriod = hourNum >= 12 ? 'PM' : 'AM'
    const newHour = hourNum === 0 ? '12' : hourNum > 12 ? String(hourNum - 12) : String(hourNum)

    setHour(newHour)
    setMinute(m)
    setPeriod(newPeriod)
    onChange(time)
  }

  const isOptimalTime = (time: string): boolean => {
    return optimalTimes.includes(time)
  }

  const currentTime = `${to24Hour(hour, period)}:${minute}`

  return (
    <div className="space-y-4">
      {/* Label and Timezone */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {label}
        </label>
        <span className="text-xs text-gray-500">{timezone}</span>
      </div>

      {/* Quick Time Buttons */}
      <div className="grid grid-cols-5 gap-2">
        {QUICK_TIMES.map((qt) => {
          const isSelected = `${to24Hour(hour, period)}:${minute}` === qt.time
          const isOptimal = isOptimalTime(qt.time)

          return (
            <button
              key={qt.time}
              type="button"
              onClick={() => handleQuickTime(qt.time)}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all text-xs font-medium",
                isSelected
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50",
                isOptimal && !isSelected && "border-green-300 bg-green-50"
              )}
            >
              {isOptimal && !isSelected && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
              <span className="text-lg mb-1">{qt.icon}</span>
              <span>{qt.label}</span>
            </button>
          )
        })}
      </div>

      {/* Custom Time Picker */}
      <div className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center justify-center gap-3">
          {/* Hour Selector */}
          <div className="flex flex-col items-center">
            <label className="text-xs text-gray-600 mb-2">Hour</label>
            <select
              value={hour}
              onChange={(e) => {
                setHour(e.target.value)
                handleTimeChange(e.target.value, undefined, undefined)
              }}
              className="w-16 p-2 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          <span className="text-2xl font-bold text-gray-400 mt-6">:</span>

          {/* Minute Selector */}
          <div className="flex flex-col items-center">
            <label className="text-xs text-gray-600 mb-2">Minute</label>
            <select
              value={minute}
              onChange={(e) => {
                setMinute(e.target.value)
                handleTimeChange(undefined, e.target.value, undefined)
              }}
              className="w-16 p-2 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
            >
              {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                <option key={m} value={m.toString().padStart(2, '0')}>
                  {m.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          {/* AM/PM Toggle */}
          <div className="flex flex-col items-center">
            <label className="text-xs text-gray-600 mb-2">Period</label>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  setPeriod('AM')
                  handleTimeChange(undefined, undefined, 'AM')
                }}
                className={cn(
                  "px-3 py-1 text-sm font-semibold rounded-lg transition-all",
                  period === 'AM'
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                )}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriod('PM')
                  handleTimeChange(undefined, undefined, 'PM')
                }}
                className={cn(
                  "px-3 py-1 text-sm font-semibold rounded-lg transition-all",
                  period === 'PM'
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                )}
              >
                PM
              </button>
            </div>
          </div>
        </div>

        {/* Selected Time Display */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-200 rounded-lg">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-lg font-semibold text-gray-900">
              {hour}:{minute} {period}
            </span>
            {isOptimalTime(currentTime) && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                ⭐ Optimal
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Optimal Times Hint */}
      {optimalTimes.length > 0 && (
        <div className="text-xs text-gray-600 bg-green-50 border border-green-200 rounded-lg p-3">
          <span className="font-medium text-green-700">💡 Tip:</span> Times marked with a green dot are optimal for your selected platforms based on best practices.
        </div>
      )}
    </div>
  )
}
