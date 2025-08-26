'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface PinterestBoardSelectorProps {
  selectedPlatforms: string[]
  selectedPinterestBoard: string
  setSelectedPinterestBoard: (board: string) => void
  pinterestTitle: string
  setPinterestTitle: (title: string) => void
  pinterestDescription?: string
  setPinterestDescription?: (description: string) => void
  pinterestLink?: string
  setPinterestLink?: (link: string) => void
  pinterestBoards: any[]
  setPinterestBoards: (boards: any[]) => void
}

export function PinterestBoardSelector({
  selectedPlatforms,
  selectedPinterestBoard,
  setSelectedPinterestBoard,
  pinterestTitle,
  setPinterestTitle,
  pinterestDescription,
  setPinterestDescription,
  pinterestLink,
  setPinterestLink,
  pinterestBoards,
  setPinterestBoards
}: PinterestBoardSelectorProps) {
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && selectedPlatforms.includes('pinterest') && pinterestBoards.length === 0) {
      fetchPinterestBoards()
    }
  }, [mounted, selectedPlatforms])

  const fetchPinterestBoards = async () => {
    if (loading) return
    setLoading(true)
    try {
      const response = await fetch('/api/pinterest/boards')
      const data = await response.json()
      
      if (data.success && data.boards) {
        setPinterestBoards(data.boards)
        // Auto-select first board if available
        if (data.boards.length > 0) {
          setSelectedPinterestBoard(data.boards[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch Pinterest boards:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !selectedPlatforms.includes('pinterest')) {
    return null
  }

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
      <Label className="text-sm font-medium text-red-800 mb-2 block">
        Pinterest Settings
      </Label>
      
      {/* Board Selection */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="pinterest-board" className="text-xs text-gray-600">
            Select Board <span className="text-red-500">*</span>
          </Label>
          <select
            id="pinterest-board"
            value={selectedPinterestBoard}
            onChange={(e) => setSelectedPinterestBoard(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            disabled={loading}
          >
            {loading ? (
              <option value="">Loading boards...</option>
            ) : pinterestBoards.length === 0 ? (
              <option value="">No boards found</option>
            ) : (
              <>
                <option value="">Select a board</option>
                {pinterestBoards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* Pin Title */}
        <div>
          <Label htmlFor="pinterest-title" className="text-xs text-gray-600">
            Pin Title (optional)
          </Label>
          <Input
            id="pinterest-title"
            type="text"
            value={pinterestTitle}
            onChange={(e) => setPinterestTitle(e.target.value)}
            placeholder="Enter pin title..."
            className="mt-1"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">
            {pinterestTitle.length}/100 characters
          </p>
        </div>

        {/* Pin Description */}
        <div>
          <Label htmlFor="pinterest-description" className="text-xs text-gray-600">
            Pin Description (optional)
          </Label>
          <Textarea
            id="pinterest-description"
            value={pinterestDescription || ''}
            onChange={(e) => setPinterestDescription?.(e.target.value)}
            placeholder="Enter pin description... (will use main content if empty)"
            className="mt-1 min-h-[80px]"
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {(pinterestDescription || '').length}/500 characters
          </p>
        </div>

        {/* Pin Link */}
        <div>
          <Label htmlFor="pinterest-link" className="text-xs text-gray-600">
            Destination Link (optional)
          </Label>
          <Input
            id="pinterest-link"
            type="url"
            value={pinterestLink || ''}
            onChange={(e) => setPinterestLink?.(e.target.value)}
            placeholder="https://example.com"
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            URL where users will be directed when clicking the pin
          </p>
        </div>

        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          ⚠️ Pinterest requires at least one image to create a pin
        </div>
      </div>
    </div>
  )
}