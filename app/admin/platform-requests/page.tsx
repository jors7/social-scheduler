'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Download,
  TrendingUp,
  Users,
  Sparkles,
  Calendar
} from 'lucide-react'

interface PlatformRequest {
  id: string
  platform_name: string
  vote_count: number
  is_custom: boolean
  requested_by: string | null
  created_at: string
  updated_at: string
}

interface Stats {
  totalRequests: number
  customRequests: number
  suggestedRequests: number
  totalVotes: number
}

interface RequestsResponse {
  requests: PlatformRequest[]
  stats: Stats
}

export default function AdminPlatformRequestsPage() {
  const [requests, setRequests] = useState<PlatformRequest[]>([])
  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    customRequests: 0,
    suggestedRequests: 0,
    totalVotes: 0
  })
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'votes' | 'date'>('votes')

  useEffect(() => {
    fetchRequests()
  }, [typeFilter])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        ...(typeFilter !== 'all' && { type: typeFilter })
      })

      const response = await fetch(`/api/admin/platform-requests?${params}`)

      console.log('[Platform Requests Page] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[Platform Requests Page] Error response:', errorData)
        throw new Error(errorData.error || errorData.details || 'Failed to fetch platform requests')
      }

      const data: RequestsResponse = await response.json()
      console.log('[Platform Requests Page] Success:', data)
      setRequests(data.requests)
      setStats(data.stats)
    } catch (error: any) {
      console.error('[Platform Requests Page] Error fetching platform requests:', error)
      toast.error(error.message || 'Failed to load platform requests')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeBadgeColor = (isCustom: boolean) => {
    return isCustom
      ? 'bg-purple-100 text-purple-700'
      : 'bg-blue-100 text-blue-700'
  }

  const exportToCSV = () => {
    try {
      const headers = ['Platform Name', 'Vote Count', 'Type', 'Created At', 'Updated At']
      const rows = requests.map(req => [
        req.platform_name,
        req.vote_count.toString(),
        req.is_custom ? 'Custom' : 'Pre-suggested',
        new Date(req.created_at).toISOString(),
        new Date(req.updated_at).toISOString()
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `platform-requests-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('CSV exported successfully')
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast.error('Failed to export CSV')
    }
  }

  const sortedRequests = [...requests].sort((a, b) => {
    if (sortBy === 'votes') {
      return b.vote_count - a.vote_count
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Platform Requests</h2>
          <p className="text-muted-foreground">
            View and manage user platform requests and votes
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" disabled={loading || requests.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              All platform requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Requests</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customRequests}</div>
            <p className="text-xs text-muted-foreground">
              User-submitted platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pre-suggested</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suggestedRequests}</div>
            <p className="text-xs text-muted-foreground">
              Built-in platform options
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVotes}</div>
            <p className="text-xs text-muted-foreground">
              Combined vote count
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('all')}
              >
                All Requests
              </Button>
              <Button
                variant={typeFilter === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('custom')}
              >
                Custom Only
              </Button>
              <Button
                variant={typeFilter === 'suggested' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('suggested')}
              >
                Pre-suggested Only
              </Button>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button
                variant={sortBy === 'votes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('votes')}
              >
                Sort by Votes
              </Button>
              <Button
                variant={sortBy === 'date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('date')}
              >
                Sort by Date
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No platform requests found</p>
              <p className="text-sm">Platform requests will appear here when users submit them</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Votes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {request.platform_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                          <span className="text-sm font-semibold text-gray-900">
                            {request.vote_count}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getTypeBadgeColor(request.is_custom)}>
                          {request.is_custom ? 'Custom' : 'Pre-suggested'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(request.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
