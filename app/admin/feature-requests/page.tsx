'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Loader2,
  TrendingUp,
  Filter,
  ArrowUpDown,
  Download,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  FeatureRequest,
  FeatureCategory,
  FeatureStatus,
  FeaturePriority,
  FeatureRequestStats,
  UpdateFeatureRequestForm
} from '@/lib/feature-requests/types'
import {
  FEATURE_CATEGORIES,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  getCategoryConfig,
  getStatusConfig,
  getPriorityConfig
} from '@/lib/feature-requests/constants'

export default function AdminFeatureRequestsPage() {
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [stats, setStats] = useState<FeatureRequestStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<FeatureStatus | 'all'>('all')
  const [selectedPriority, setSelectedPriority] = useState<FeaturePriority | 'all'>('all')
  const [sortBy, setSortBy] = useState<string>('votes')

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<UpdateFeatureRequestForm>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [selectedCategory, selectedStatus, selectedPriority, sortBy])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      if (selectedPriority !== 'all') params.append('priority', selectedPriority)
      params.append('sort', sortBy)

      const response = await fetch(`/api/admin/feature-requests?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
        setStats(data.stats || null)
      } else if (response.status === 403) {
        toast.error('Unauthorized - Admin access required')
      } else {
        toast.error('Failed to load feature requests')
      }
    } catch (error) {
      console.error('Error loading requests:', error)
      toast.error('Failed to load feature requests')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (request: FeatureRequest) => {
    setEditingId(request.id)
    setEditForm({
      status: request.status,
      priority: request.priority,
      admin_notes: request.admin_notes || '',
      estimated_completion_date: request.estimated_completion_date || null,
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveChanges = async (id: string) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/feature-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        toast.success('Feature request updated successfully')
        setEditingId(null)
        setEditForm({})
        await loadRequests()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update feature request')
      }
    } catch (error) {
      console.error('Error updating feature request:', error)
      toast.error('Failed to update feature request')
    } finally {
      setSaving(false)
    }
  }

  const deleteRequest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feature request? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/feature-requests/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Feature request deleted successfully')
        await loadRequests()
      } else if (response.status === 403) {
        toast.error('Unauthorized - Super admin access required')
      } else {
        toast.error('Failed to delete feature request')
      }
    } catch (error) {
      console.error('Error deleting feature request:', error)
      toast.error('Failed to delete feature request')
    }
  }

  const exportToCSV = () => {
    const csv = [
      ['ID', 'Title', 'Category', 'Status', 'Priority', 'Votes', 'Is Custom', 'Created At'].join(','),
      ...requests.map(r => [
        r.id,
        `"${r.title.replace(/"/g, '""')}"`,
        r.category,
        r.status,
        r.priority,
        r.vote_count,
        r.is_custom,
        r.created_at
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feature-requests-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported to CSV')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Feature Requests</h1>
        <p className="text-gray-600 mt-2">Manage and prioritize user feature requests</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.customRequests} custom, {stats.suggestedRequests} suggested
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Votes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVotes}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total > 0 ? (stats.totalVotes / stats.total).toFixed(1) : 0} avg per request
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStatus.in_progress}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.byStatus.planned} planned, {stats.byStatus.completed} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Under Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStatus.under_review + stats.byStatus.submitted}</div>
              <p className="text-xs text-gray-500 mt-1">
                Awaiting decision
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            {/* Filters */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  Category
                </Label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as FeatureCategory | 'all')}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Categories</option>
                  {FEATURE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  Status
                </Label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as FeatureStatus | 'all')}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  {Object.values(STATUS_CONFIG).map(status => (
                    <option key={status.id} value={status.id}>{status.icon} {status.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  Priority
                </Label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as FeaturePriority | 'all')}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Priorities</option>
                  {Object.values(PRIORITY_CONFIG).map(priority => (
                    <option key={priority.id} value={priority.id}>{priority.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" />
                  Sort By
                </Label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="votes">Most Voted</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="updated">Recently Updated</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>

            {/* Export Button */}
            <Button onClick={exportToCSV} variant="outline" className="whitespace-nowrap">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">No feature requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map(request => {
            const isEditing = editingId === request.id
            const categoryConfig = getCategoryConfig(request.category)
            const statusConfig = getStatusConfig(request.status)
            const priorityConfig = getPriorityConfig(request.priority)

            return (
              <Card key={request.id}>
                <CardContent className="pt-6">
                  {isEditing ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{request.title}</h3>
                        {request.description && (
                          <p className="text-sm text-gray-600">{request.description}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs mb-1.5">Status</Label>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as FeatureStatus })}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          >
                            {Object.values(STATUS_CONFIG).map(status => (
                              <option key={status.id} value={status.id}>{status.icon} {status.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label className="text-xs mb-1.5">Priority</Label>
                          <select
                            value={editForm.priority}
                            onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as FeaturePriority })}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          >
                            {Object.values(PRIORITY_CONFIG).map(priority => (
                              <option key={priority.id} value={priority.id}>{priority.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label className="text-xs mb-1.5">Estimated Completion</Label>
                          <input
                            type="date"
                            value={editForm.estimated_completion_date?.split('T')[0] || ''}
                            onChange={(e) => setEditForm({ ...editForm, estimated_completion_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs mb-1.5">Admin Notes (Internal)</Label>
                        <Textarea
                          value={editForm.admin_notes || ''}
                          onChange={(e) => setEditForm({ ...editForm, admin_notes: e.target.value })}
                          placeholder="Internal notes for the team..."
                          rows={3}
                          className="text-sm"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={() => saveChanges(request.id)} disabled={saving} size="sm">
                          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          Save Changes
                        </Button>
                        <Button onClick={cancelEditing} variant="outline" size="sm">
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-2xl">{categoryConfig.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{request.title}</h3>
                            {request.description && (
                              <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                            )}

                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <Badge className={cn("text-xs", categoryConfig.color)}>
                                {categoryConfig.name}
                              </Badge>
                              <Badge className={cn("text-xs", statusConfig.color)}>
                                {statusConfig.icon} {statusConfig.label}
                              </Badge>
                              <Badge className={cn("text-xs", priorityConfig.color)}>
                                {priorityConfig.label}
                              </Badge>
                              {request.is_custom && (
                                <Badge className="text-xs bg-purple-100 text-purple-700">
                                  👤 Community
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                🗳️ {request.vote_count} votes
                              </Badge>
                            </div>

                            {request.admin_notes && (
                              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                <p className="text-xs font-medium text-yellow-900">Admin Notes:</p>
                                <p className="text-xs text-yellow-800 mt-1">{request.admin_notes}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button onClick={() => startEditing(request)} variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => deleteRequest(request.id)} variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 flex items-center gap-4">
                        <span>Created: {new Date(request.created_at).toLocaleDateString()}</span>
                        <span>Updated: {new Date(request.updated_at).toLocaleDateString()}</span>
                        {request.estimated_completion_date && (
                          <span className="text-blue-600">
                            Est. Completion: {new Date(request.estimated_completion_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
