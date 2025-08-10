'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}

export function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select an option',
  className 
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-4 pr-10 border border-gray-200 rounded-xl",
          "focus:ring-2 focus:ring-purple-500 focus:border-transparent",
          "shadow-sm text-sm font-normal bg-white hover:bg-gray-50",
          "transition-all duration-200 text-left flex items-center justify-between",
          "cursor-pointer min-w-[200px]",
          !className?.includes('h-') && 'h-12',
          className
        )}
      >
        <span className="truncate pr-4">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-400 transition-transform duration-200 flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50",
                  "transition-colors duration-150 flex items-center justify-between group",
                  value === option.value && "bg-gradient-to-r from-purple-50 to-blue-50"
                )}
              >
                <span className={cn(
                  "text-sm font-medium",
                  value === option.value ? "text-purple-700" : "text-gray-700 group-hover:text-purple-700"
                )}>
                  {option.label}
                </span>
                {value === option.value && (
                  <Check className="h-4 w-4 text-purple-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}