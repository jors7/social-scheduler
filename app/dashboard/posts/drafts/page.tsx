'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CustomSelect } from '@/components/ui/custom-select'
import {
  Search,
  FileText,
  Edit,
  Trash2,
  Calendar,
  Clock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'
import { PostCard } from '@/components/post-card'
import { Pagination } from '@/components/ui/pagination'

interface Draft {
  id: string
  title: string
  content: string
  platforms: string[]
  platform_content: Record<string, string>
  media_urls: string[]
  created_at: string
  updated_at: string
  pinterest_title?: string
  pinterest_description?: string
}

// Helper function to strip HTML tags
const stripHtml = (html: string) => {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

export default function DraftPostsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('modified')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/drafts')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const data = await response.json()
      setDrafts(data.drafts || [])
    } catch (error) {
      console.error('Error fetching drafts:', error)
      toast.error('Failed to load drafts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDrafts()
  }, [])

  const handleDelete = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return

    try {
      const response = await fetch(`/api/drafts?id=${draftId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete')
      
      toast.success('Draft deleted successfully')
      fetchDrafts()
    } catch (error) {
      console.error('Error deleting draft:', error)
      toast.error('Failed to delete draft')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedDrafts.length === 0) {
      toast.error('No drafts selected')
      return
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedDrafts.length} draft${selectedDrafts.length > 1 ? 's' : ''}?`)) {
      return
    }
    
    try {
      const response = await fetch('/api/posts/drafts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftIds: selectedDrafts })
      })
      
      if (!response.ok) throw new Error('Failed to delete drafts')
      
      toast.success(`${selectedDrafts.length} draft${selectedDrafts.length > 1 ? 's' : ''} deleted successfully`)
      setSelectedDrafts([])
      fetchDrafts()
    } catch (error) {
      console.error('Error deleting drafts:', error)
      toast.error('Failed to delete drafts')
    }
  }

  const handleLoadDraft = (draftId: string) => {
    router.push(`/dashboard/create/new?draftId=${draftId}`)
  }

  const handleEdit = (draftId: string) => {
    router.push(`/dashboard/create/new?draftId=${draftId}`)
  }

  const filteredDrafts = drafts
    .filter(draft => {
      if (searchQuery && !draft.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !stripHtml(draft.content).toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'modified':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
    })

  const toggleDraftSelection = (draftId: string) => {
    setSelectedDrafts(prev =>
      prev.includes(draftId)
        ? prev.filter(id => id !== draftId)
        : [...prev, draftId]
    )
  }

  const toggleAllDrafts = () => {
    if (selectedDrafts.length === paginatedDrafts.length) {
      setSelectedDrafts([])
    } else {
      setSelectedDrafts(paginatedDrafts.map(draft => draft.id))
    }
  }

  // Paginate the filtered drafts
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDrafts = filteredDrafts.slice(startIndex, endIndex)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
            <FileText className="h-8 w-8" />
          </div>
          Draft Content
        </h1>
        <p className="text-gray-600 text-lg">
          Continue working on your saved drafts and bring your ideas to life
        </p>
      </div>

      <SubscriptionGate feature="drafts">
        <div className="space-y-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search drafts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <CustomSelect
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'modified', label: 'Sort by Last Modified' },
                { value: 'created', label: 'Sort by Created Date' },
                { value: 'title', label: 'Sort by Title' }
              ]}
              className="min-w-[200px] h-10"
            />
            {/* Add draft count */}
            {!loading && (
              <div className="flex items-center text-sm text-gray-600">
                {filteredDrafts.length} draft{filteredDrafts.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {!loading && selectedDrafts.length > 0 && (
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="flex items-center justify-between py-4">
                <span className="text-sm font-medium text-purple-900">
                  {selectedDrafts.length} draft{selectedDrafts.length > 1 ? 's' : ''} selected
                </span>
                <Button variant="outline" size="sm" onClick={handleBulkDelete} className="hover:bg-red-50 hover:border-red-300">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Drafts Grid */}
          {loading ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin" />
                <p className="text-gray-500">Loading your drafts...</p>
              </CardContent>
            </Card>
          ) : filteredDrafts.length === 0 ? (
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
              <CardContent className="text-center py-16">
                <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-6">
                  <FileText className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No drafts found</h3>
                <p className="text-gray-600 mb-6">Start creating content to see your drafts here</p>
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg" 
                  onClick={() => router.push('/dashboard/create/new')}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Create New Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Select all checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedDrafts.length === paginatedDrafts.length && paginatedDrafts.length > 0}
                  onChange={toggleAllDrafts}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Select all on this page ({paginatedDrafts.length} drafts)</span>
              </div>

              {/* Grid of draft cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedDrafts.map(draft => (
                  <PostCard
                    key={draft.id}
                    post={draft}
                    variant="draft"
                    selected={selectedDrafts.includes(draft.id)}
                    onToggleSelection={() => toggleDraftSelection(draft.id)}
                    onLoadDraft={() => handleLoadDraft(draft.id)}
                    onEdit={() => handleEdit(draft.id)}
                    onDelete={() => handleDelete(draft.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalItems={filteredDrafts.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemLabel="drafts"
              />
            </div>
          )}
        </div>
      </SubscriptionGate>
    </div>
  )
}