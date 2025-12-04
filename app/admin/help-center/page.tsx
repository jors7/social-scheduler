'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MessageSquare,
  Filter,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HelpCenterSearch {
  id: string
  query: string
  results_count: number
  had_ai_answer: boolean
  source_article_id: string | null
  user_id: string | null
  created_at: string
}

interface Stats {
  totalSearches: number
  answeredSearches: number
  unansweredSearches: number
  answerRate: number
}

export default function AdminHelpCenterPage() {
  const [searches, setSearches] = useState<HelpCenterSearch[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchFilter, setSearchFilter] = useState('')
  const [answerFilter, setAnswerFilter] = useState<'all' | 'true' | 'false'>('all')

  useEffect(() => {
    loadSearches()
  }, [answerFilter])

  const loadSearches = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limit', '200')
      if (answerFilter !== 'all') {
        params.append('had_answer', answerFilter)
      }
      if (searchFilter) {
        params.append('search', searchFilter)
      }

      const response = await fetch(`/api/admin/help-center-searches?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSearches(data.searches || [])
        setStats(data.stats || null)
      } else if (response.status === 403) {
        toast.error('Unauthorized - Admin access required')
      } else {
        toast.error('Failed to load searches')
      }
    } catch (error) {
      console.error('Error loading searches:', error)
      toast.error('Failed to load searches')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadSearches()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Group searches by query to show frequency
  const queryFrequency = searches.reduce((acc, search) => {
    const normalizedQuery = search.query.toLowerCase().trim()
    if (!acc[normalizedQuery]) {
      acc[normalizedQuery] = {
        query: search.query,
        count: 0,
        hadAnswer: search.had_ai_answer,
        lastSearched: search.created_at
      }
    }
    acc[normalizedQuery].count++
    return acc
  }, {} as Record<string, { query: string; count: number; hadAnswer: boolean; lastSearched: string }>)

  const topQueries = Object.values(queryFrequency)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Help Center Searches</h1>
          <p className="text-gray-500">Monitor what users are searching for in the help center</p>
        </div>
        <Button onClick={loadSearches} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Searches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">{stats.totalSearches}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Answered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.answeredSearches}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Unanswered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-2xl font-bold">{stats.unansweredSearches}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Answer Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <span className="text-2xl font-bold">{stats.answerRate}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Queries */}
      {topQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Searched Queries</CardTitle>
            <CardDescription>Most frequently searched terms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topQueries.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                    <span className="text-sm">{item.query}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={item.hadAnswer ? 'default' : 'destructive'}>
                      {item.hadAnswer ? 'Answered' : 'No Answer'}
                    </Badge>
                    <Badge variant="outline">{item.count}x</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Searches</CardTitle>
          <CardDescription>Browse all help center search queries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search queries..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </form>
            <div className="flex gap-2">
              <Button
                variant={answerFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnswerFilter('all')}
              >
                All
              </Button>
              <Button
                variant={answerFilter === 'true' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnswerFilter('true')}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Answered
              </Button>
              <Button
                variant={answerFilter === 'false' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnswerFilter('false')}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Unanswered
              </Button>
            </div>
          </div>

          {/* Search Results Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : searches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No searches found
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Query</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Results</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source Article</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {searches.map((search) => (
                    <tr key={search.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium">{search.query}</span>
                      </td>
                      <td className="px-4 py-3">
                        {search.had_ai_answer ? (
                          <Badge variant="default" className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Answered
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3 mr-1" />
                            No Answer
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">{search.results_count} articles</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {search.source_article_id || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">{formatDate(search.created_at)}</span>
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
