'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TocItem, generateToc } from '@/lib/help-center/articles'
import { cn } from '@/lib/utils'

interface TocDropdownProps {
  content: string
}

export function TocDropdown({ content }: TocDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const toc = generateToc(content)

  if (toc.length === 0) return null

  const scrollToSection = (id: string) => {
    // For now, just close the dropdown
    // In a full implementation, you'd scroll to the section
    setIsOpen(false)
  }

  return (
    <div className="border border-gray-200 rounded-xl mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <span className="font-medium text-gray-700">Table of contents</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <ul className="mt-2 space-y-1">
            {toc.map((item, index) => (
              <li key={index}>
                <button
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    'text-sm text-gray-600 hover:text-purple-600 transition-colors text-left',
                    item.level === 3 && 'pl-4'
                  )}
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
