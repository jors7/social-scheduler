'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Info, MapPin, X, Search, Loader2, ChevronDown } from 'lucide-react'

interface InstagramLocationPickerProps {
  location: { id: string; name: string } | null
  setLocation: (location: { id: string; name: string } | null) => void
}

interface LocationResult {
  id: string
  name: string
  address: string
  city: string
  state: string
  country: string
}

/**
 * Instagram Location Picker Component
 *
 * Allows users to search and select locations for Instagram posts using
 * the Facebook Pages Search API. Locations must have geographic coordinates
 * to be used as location_id in Instagram posts.
 *
 * Features:
 * - Live search with autocomplete
 * - Debounced API calls (300ms)
 * - Shows location name, address, and city
 * - Manual entry fallback option
 *
 * API Reference: https://developers.facebook.com/docs/pages/searching
 */
export function InstagramLocationPicker({
  location,
  setLocation
}: InstagramLocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualId, setManualId] = useState('')
  const [manualName, setManualName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounced search function
  const performSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch(`/api/instagram/locations/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Location search failed')
      }

      setSearchResults(data.locations || [])
      setShowResults(true)
    } catch (err: any) {
      console.error('Location search error:', err)
      setError(err.message)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search input change with debouncing
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value)
    }, 300) // 300ms debounce
  }

  // Handle location selection
  const handleSelectLocation = (loc: LocationResult) => {
    setLocation({
      id: loc.id,
      name: loc.name
    })
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  // Handle manual entry
  const handleManualAdd = () => {
    if (manualId.trim() && manualName.trim()) {
      setLocation({
        id: manualId.trim(),
        name: manualName.trim()
      })
      setManualId('')
      setManualName('')
      setShowManualEntry(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-pink-600" />
          Instagram Location Tag
        </CardTitle>
        <CardDescription>
          Search for a location to tag in your post
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {location ? (
          // Show selected location
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-full">
                <MapPin className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{location.name}</p>
                <p className="text-sm text-gray-600">ID: {location.id}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLocation(null)}
              className="h-9 w-9 p-0 hover:bg-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          // Show search interface
          <>
            <div className="relative" ref={dropdownRef}>
              <Label htmlFor="location-search" className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4" />
                Search for a location
              </Label>
              <div className="relative">
                <Input
                  id="location-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Try 'Starbucks New York' or 'Central Park'..."
                  className="pr-10"
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelectLocation(result)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{result.name}</p>
                          <p className="text-sm text-gray-600 truncate">
                            {[result.address, result.city, result.state, result.country]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results Message */}
              {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                  <p className="text-sm text-gray-600 text-center">
                    No locations found for &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    Try a different search term or use manual entry below
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Manual Entry Toggle */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowManualEntry(!showManualEntry)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showManualEntry ? 'rotate-180' : ''}`} />
                Can&apos;t find your location? Enter manually
              </button>

              {showManualEntry && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div>
                    <Label htmlFor="manual-location-name" className="text-sm">Location Name</Label>
                    <Input
                      id="manual-location-name"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="e.g., Times Square"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manual-location-id" className="text-sm">Facebook Page ID</Label>
                    <Input
                      id="manual-location-id"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      placeholder="e.g., 212988663"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleManualAdd}
                    disabled={!manualId.trim() || !manualName.trim()}
                    size="sm"
                    className="w-full"
                  >
                    Add Location
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Info Box */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">How location tagging works:</p>
              <ul className="space-y-0.5">
                <li>• Search powered by Google Places</li>
                <li>• Selected location will appear on your Instagram post</li>
                <li>• Helps people discover your content by location</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
