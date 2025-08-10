'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CustomSelect } from '@/components/ui/custom-select'
import { 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  FileText,
  Send,
  Calendar,
  Save,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'

interface Draft {
  id: string
  title: string
  content: string
  platforms: string[]
  platform_content: Record<string, string>
  media_urls: string[]
  created_at: string
  updated_at: string
}

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  instagram: '📷',
  facebook: 'f',
  linkedin: 'in',
  youtube: '▶',
  tiktok: '♪',
  threads: '@',
  bluesky: '🦋',
  pinterest: 'P',
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

// Helper function to count words
const countWords = (text: string) => {
  const plainText = stripHtml(text)
  return plainText.split(/\s+/).filter(word => word.length > 0).length
}

export default function DraftPostsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('modified') // 'modified', 'created', 'title'

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
      fetchDrafts() // Refresh the list
    } catch (error) {
      console.error('Error deleting draft:', error)
      toast.error('Failed to delete draft')
    }
  }

  const handleDuplicate = async (draftId: string) => {
    try {
      const response = await fetch('/api/posts/drafts/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      })
      
      if (!response.ok) throw new Error('Failed to duplicate')
      
      toast.success('Draft duplicated successfully')
      fetchDrafts() // Refresh the list
    } catch (error) {
      console.error('Error duplicating draft:', error)
      toast.error('Failed to duplicate draft')
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
      fetchDrafts() // Refresh the list
    } catch (error) {
      console.error('Error deleting drafts:', error)
      toast.error('Failed to delete drafts')
    }
  }

  const handleEdit = (draftId: string) => {
    router.push(`/dashboard/create/new?draftId=${draftId}`)
  }

  const handleSchedule = (draftId: string) => {
    router.push(`/dashboard/create/new?draftId=${draftId}&schedule=true`)
  }

  const handlePublishNow = (draftId: string) => {
    router.push(`/dashboard/create/new?draftId=${draftId}&publish=true`)
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
    if (selectedDrafts.length === filteredDrafts.length) {
      setSelectedDrafts([])
    } else {
      setSelectedDrafts(filteredDrafts.map(draft => draft.id))
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      if (hours === 0) {
        const minutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
        return `${minutes} minutes ago`
      }
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24)
      return `${days} day${days !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl text-white">
              <FileText className="h-8 w-8" />
            </div>
            Draft Content
          </h1>
        </div>
        <Card variant="glass" className="border-orange-200">
          <CardContent className="text-center py-12">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full mb-4">
              <FileText className="h-8 w-8 text-orange-600 animate-pulse" />
            </div>
            <p className="text-gray-600 font-medium">Loading your drafts...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with gradient title */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl text-white">
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
      </div>

      {/* Summary Stats - Elevated cards with gradients */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="elevated" className="hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Drafts</p>
                <p className="text-2xl font-bold text-gray-900">{filteredDrafts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" className="hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Created Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredDrafts.filter(d => {
                    const today = new Date()
                    const created = new Date(d.created_at)
                    return created.toDateString() === today.toDateString()
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" className="hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Modified This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredDrafts.filter(d => {
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return new Date(d.updated_at) > weekAgo
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions - Glass morphism effect */}
      {selectedDrafts.length > 0 && (
        <Card variant="glass" className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium text-orange-900">
              {selectedDrafts.length} draft{selectedDrafts.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkDelete} className="hover:bg-red-50 hover:border-red-300">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                if (selectedDrafts.length === 1) {
                  handleDuplicate(selectedDrafts[0])
                } else {
                  toast.error('Please select only one draft to duplicate')
                }
              }} className="hover:bg-blue-50 hover:border-blue-300">
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drafts List */}
      <div className="space-y-4">
        {filteredDrafts.length === 0 ? (
          <Card variant="gradient" className="from-orange-50 to-amber-50">
            <CardContent className="text-center py-16">
              <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full mb-6">
                <FileText className="h-12 w-12 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No drafts found</h3>
              <p className="text-gray-600 mb-6">Start creating content to see your drafts here</p>
              <Button className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg" onClick={() => router.push('/dashboard/create/new')}>
                <Edit className="mr-2 h-4 w-4" />
                Create New Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4">
              <input
                type="checkbox"
                checked={selectedDrafts.length === filteredDrafts.length}
                onChange={toggleAllDrafts}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Select all</span>
            </div>
            
            {filteredDrafts.map(draft => {              
              const wordCount = countWords(draft.content)
              const plainContent = stripHtml(draft.content)
              
              return (
                <Card key={draft.id} variant="elevated" className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                  <CardContent className="p-0">
                    <div className="flex items-start p-4 gap-4">
                      <input
                        type="checkbox"
                        checked={selectedDrafts.includes(draft.id)}
                        onChange={() => toggleDraftSelection(draft.id)}
                        className="mt-1 rounded border-gray-300"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">
                                {draft.title || <span className="text-gray-400 italic">Untitled Draft</span>}
                              </h3>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                <FileText className="mr-1 h-3 w-3" />
                                Draft
                              </span>
                            </div>
                            <p className="text-gray-600 mt-1 line-clamp-2">{plainContent}</p>
                            
                            <div className="flex items-center gap-4 mt-3">
                              <span className="text-sm text-gray-500">
                                <Clock className="inline h-3 w-3 mr-1" />
                                Modified {formatDate(draft.updated_at)}
                              </span>
                              
                              <span className="text-sm text-gray-500">
                                {wordCount} words
                              </span>
                              
                              <div className="flex gap-1">
                                {draft.platforms.map(platform => (
                                  <span
                                    key={platform}
                                    className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs"
                                    title={platform}
                                  >
                                    {platformIcons[platform] || platform[0].toUpperCase()}
                                  </span>
                                ))}
                              </div>

                              {draft.media_urls.length > 0 && (
                                <span className="text-sm text-gray-500">
                                  📎 {draft.media_urls.length} attachment{draft.media_urls.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            
                            {/* Quick Actions */}
                            <div className="flex gap-2 mt-4">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs hover:bg-blue-50 hover:border-blue-300"
                                onClick={() => handleEdit(draft.id)}
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Continue Editing
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs hover:bg-purple-50 hover:border-purple-300"
                                onClick={() => handleSchedule(draft.id)}
                              >
                                <Calendar className="mr-1 h-3 w-3" />
                                Schedule
                              </Button>
                              <Button 
                                size="sm" 
                                className="text-xs bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm"
                                onClick={() => handlePublishNow(draft.id)}
                              >
                                <Send className="mr-1 h-3 w-3" />
                                Publish Now
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(draft.id)}
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          </div>
                          
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </>
        )}
      </div>
        </div>
      </SubscriptionGate>
    </div>
  )
}