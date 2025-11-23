'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Send, Lightbulb, Vote, Filter, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeatureRequestCard } from './FeatureRequestCard'
import type {
  FeatureRequest,
  FeatureCategory,
  FeatureStatus,
  CreateFeatureRequestForm
} from '@/lib/feature-requests/types'
import {
  FEATURE_CATEGORIES,
  STATUS_CONFIG,
  SORT_OPTIONS,
  type SortOption,
  MESSAGES,
  VALIDATION
} from '@/lib/feature-requests/constants'

interface FeatureRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TabType = 'browse' | 'submit'

export function FeatureRequestModal({ open, onOpenChange }: FeatureRequestModalProps) {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('browse')
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [votedFeatures, setVotedFeatures] = useState<string[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)

  // Filters and sorting
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<FeatureStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('votes')

  // Submit form state
  const [formData, setFormData] = useState<CreateFeatureRequestForm>({
    title: '',
    description: '',
    category: 'other',
  })
  const [submitting, setSubmitting] = useState(false)

  // Load feature requests when modal opens
  useEffect(() => {
    if (open) {
      loadRequests()
      // Reset to browse tab when opening
      setActiveTab('browse')
    }
  }, [open])

  // Reload when filters change
  useEffect(() => {
    if (open) {
      loadRequests()
    }
  }, [selectedCategory, selectedStatus, sortBy])

  const loadRequests = async () => {
    setLoadingRequests(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      params.append('sort', sortBy)

      const response = await fetch(`/api/feature-requests?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
        setVotedFeatures(data.votedFeatures || [])
      } else {
        toast.error(MESSAGES.ERROR_LOADING)
      }
    } catch (error) {
      console.error('Error loading feature requests:', error)
      toast.error(MESSAGES.ERROR_LOADING)
    } finally {
      setLoadingRequests(false)
    }
  }

  const handleVote = async (featureId: string) => {
    try {
      const response = await fetch('/api/feature-requests/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        await loadRequests() // Reload to get updated counts and vote status
      } else {
        const error = await response.json()
        toast.error(error.error || MESSAGES.ERROR_GENERIC)
      }
    } catch (error) {
      console.error('Error voting:', error)
      toast.error(MESSAGES.ERROR_GENERIC)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.title.trim()) {
      toast.error(MESSAGES.TITLE_TOO_SHORT)
      return
    }

    if (formData.title.length > VALIDATION.TITLE_MAX_LENGTH) {
      toast.error(MESSAGES.TITLE_TOO_LONG)
      return
    }

    if (formData.description && formData.description.length > VALIDATION.DESCRIPTION_MAX_LENGTH) {
      toast.error(MESSAGES.DESCRIPTION_TOO_LONG)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/feature-requests/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)

        // Reset form
        setFormData({
          title: '',
          description: '',
          category: 'other',
        })

        // Switch to browse tab and reload
        setActiveTab('browse')
        await loadRequests()
      } else {
        const error = await response.json()
        toast.error(error.error || MESSAGES.ERROR_GENERIC)
      }
    } catch (error) {
      console.error('Error submitting feature request:', error)
      toast.error(MESSAGES.ERROR_GENERIC)
    } finally {
      setSubmitting(false)
    }
  }

  // Filter requests by category and status
  const filteredRequests = requests

  // Separate pre-suggested and custom requests
  const suggestedFeatures = filteredRequests.filter(r => !r.is_custom)
  const customFeatures = filteredRequests.filter(r => r.is_custom)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            Request a Feature
          </DialogTitle>
          <DialogDescription>
            Help us build what matters to you. Vote on existing ideas or suggest new ones.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('browse')}
            className={cn(
              "px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px",
              activeTab === 'browse'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            <span className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              Browse & Vote
            </span>
          </button>
          <button
            onClick={() => setActiveTab('submit')}
            className={cn(
              "px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px",
              activeTab === 'submit'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            <span className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Submit New
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto mt-4">
          {activeTab === 'browse' ? (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Category Filter */}
                <div className="flex-1">
                  <Label className="text-xs text-gray-600 flex items-center gap-1 mb-1.5">
                    <Filter className="h-3 w-3" />
                    Category
                  </Label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as FeatureCategory | 'all')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {FEATURE_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex-1">
                  <Label className="text-xs text-gray-600 flex items-center gap-1 mb-1.5">
                    <Filter className="h-3 w-3" />
                    Status
                  </Label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as FeatureStatus | 'all')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    {Object.values(STATUS_CONFIG).map(status => (
                      <option key={status.id} value={status.id}>
                        {status.icon} {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div className="flex-1">
                  <Label className="text-xs text-gray-600 flex items-center gap-1 mb-1.5">
                    <ArrowUpDown className="h-3 w-3" />
                    Sort By
                  </Label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SORT_OPTIONS.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Loading State */}
              {loadingRequests ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {/* Suggested Features */}
                  {suggestedFeatures.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span>🌟</span>
                        Popular Requests
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {suggestedFeatures.map(feature => (
                          <FeatureRequestCard
                            key={feature.id}
                            feature={feature}
                            hasVoted={votedFeatures.includes(feature.id)}
                            onVote={handleVote}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Features */}
                  {customFeatures.length > 0 && (
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span>💡</span>
                        Community Requests
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {customFeatures.map(feature => (
                          <FeatureRequestCard
                            key={feature.id}
                            feature={feature}
                            hasVoted={votedFeatures.includes(feature.id)}
                            onVote={handleVote}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {filteredRequests.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-sm">
                        No feature requests found. Be the first to submit one!
                      </p>
                      <Button
                        onClick={() => setActiveTab('submit')}
                        variant="outline"
                        className="mt-4"
                      >
                        Submit Feature Request
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            // Submit Tab
            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Be specific about what you need and why it would be valuable.
                  This helps us understand and prioritize your request.
                </p>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                  Feature Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Bulk post scheduling from CSV"
                  maxLength={VALIDATION.TITLE_MAX_LENGTH}
                  disabled={submitting}
                  className="mt-1.5"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.title.length}/{VALIDATION.TITLE_MAX_LENGTH} characters
                </p>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your feature request in detail. What problem does it solve? How would you use it?"
                  maxLength={VALIDATION.DESCRIPTION_MAX_LENGTH}
                  disabled={submitting}
                  className="mt-1.5 min-h-[100px]"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/{VALIDATION.DESCRIPTION_MAX_LENGTH} characters
                </p>
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as FeatureCategory })}
                  disabled={submitting}
                  className="mt-1.5 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {FEATURE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name} - {cat.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('browse')}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !formData.title.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center pt-2">
                Your request will be reviewed by our team. You'll automatically vote for your own feature.
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
