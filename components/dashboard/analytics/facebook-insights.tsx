'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  MousePointer, 
  Eye, 
  Users, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  Info,
  Facebook
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface FacebookMetrics {
  impressions: number
  engagement: number
  clicks: number
  reactions: number
  likes: number
  comments: number
  shares: number
}

interface FacebookPost {
  id: string
  message: string
  created_time: string
  permalink_url: string
  media_type: string
  media_url?: string
  metrics?: FacebookMetrics
}

interface FacebookInsightsProps {
  className?: string
}

export function FacebookInsights({ className }: FacebookInsightsProps) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pageInsights, setPageInsights] = useState<any>(null)
  const [recentPosts, setRecentPosts] = useState<FacebookPost[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'days_28'>('week')
  const [hasFacebookAccount, setHasFacebookAccount] = useState(false)
  const [facebookAccounts, setFacebookAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)

  const fetchFacebookInsights = async (accountId?: string) => {
    try {
      setLoading(true)
      
      // Check if Facebook account is connected
      const accountResponse = await fetch('/api/social-accounts')
      if (accountResponse.ok) {
        const accounts = await accountResponse.json()
        const facebookAccountsList = accounts.filter((acc: any) => acc.platform === 'facebook' && acc.is_active)
        
        if (facebookAccountsList.length === 0) {
          setHasFacebookAccount(false)
          return
        }
        
        setHasFacebookAccount(true)
        setFacebookAccounts(facebookAccountsList)
        
        // Select account to use
        const accountToUse = accountId 
          ? facebookAccountsList.find((acc: any) => acc.id === accountId) 
          : selectedAccount 
          || facebookAccountsList[0]
        
        setSelectedAccount(accountToUse)
      } else {
        return
      }

      // Fetch page-level insights for the selected account
      const queryParams = new URLSearchParams({
        type: 'page',
        period: selectedPeriod,
        ...(selectedAccount?.id && { accountId: selectedAccount.id })
      })
      const pageInsightsResponse = await fetch(`/api/facebook/insights?${queryParams}`)
      if (pageInsightsResponse.ok) {
        const data = await pageInsightsResponse.json()
        setPageInsights(data.insights)
      }

      // Fetch recent posts directly from Facebook
      const mediaQueryParams = new URLSearchParams({
        limit: '5',
        ...(selectedAccount?.id && { accountId: selectedAccount.id })
      })
      const mediaResponse = await fetch(`/api/facebook/media?${mediaQueryParams}`)
      if (mediaResponse.ok) {
        const { media } = await mediaResponse.json()
        setRecentPosts(media || [])
      }
    } catch (error) {
      console.error('Error fetching Facebook insights:', error)
      toast.error('Failed to load Facebook insights')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Add a small delay to prevent rapid re-renders
    const timer = setTimeout(() => {
      fetchFacebookInsights()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [selectedPeriod])

  const handleRefresh = async () => {
    setRefreshing(true)
    
    // First update all Facebook post metrics in the database
    try {
      const updateResponse = await fetch('/api/facebook/update-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (updateResponse.ok) {
        const result = await updateResponse.json()
        console.log('Updated Facebook metrics:', result)
        if (result.updatedCount > 0) {
          toast.success(`Updated metrics for ${result.updatedCount} posts`)
        }
      }
    } catch (error) {
      console.error('Error updating metrics:', error)
    }
    
    // Then fetch the insights
    fetchFacebookInsights()
  }

  if (!hasFacebookAccount) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5" />
            Facebook Insights
          </CardTitle>
          <CardDescription>
            Connect your Facebook Page to view insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Facebook className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No Facebook Page connected
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/settings'}>
              Connect Facebook
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading && !pageInsights) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5" />
            Facebook Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getChangeIndicator = (current: number, previous: number) => {
    if (!previous || previous === 0) return null
    const change = ((current - previous) / previous) * 100
    
    if (change > 0) {
      return (
        <span className="flex items-center text-xs text-green-600">
          <TrendingUp className="h-3 w-3 mr-1" />
          +{change.toFixed(1)}%
        </span>
      )
    } else if (change < 0) {
      return (
        <span className="flex items-center text-xs text-red-600">
          <TrendingDown className="h-3 w-3 mr-1" />
          {change.toFixed(1)}%
        </span>
      )
    }
    return null
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Page Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Facebook className="h-5 w-5" />
                Facebook Page Insights
                {selectedAccount && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedAccount.display_name || selectedAccount.username}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedAccount 
                  ? `Analytics for ${selectedAccount.display_name || selectedAccount.username}`
                  : 'Performance metrics for your Facebook Page'}
              </CardDescription>
              {facebookAccounts.length > 1 && (
                <div className="mt-2">
                  <select
                    className="text-sm border rounded-lg px-3 py-1.5 bg-white"
                    value={selectedAccount?.id || ''}
                    onChange={(e) => {
                      const account = facebookAccounts.find(acc => acc.id === e.target.value)
                      if (account) {
                        setSelectedAccount(account)
                        fetchFacebookInsights(account.id)
                      }
                    }}
                  >
                    {facebookAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.display_name || account.username}
                      </option>
                    ))}
                  </select>
                  <span className="ml-2 text-xs text-gray-500">
                    Switch between {facebookAccounts.length} connected pages
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                className="text-xs border rounded-lg px-2 py-1"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
              >
                <option value="day">Last 24 hours</option>
                <option value="week">Last 7 days</option>
                <option value="days_28">Last 28 days</option>
              </select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Page Impressions */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4" />
                <span>Impressions</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(pageInsights?.impressions?.value || 0)}
              </p>
              {getChangeIndicator(pageInsights?.impressions?.value || 0, pageInsights?.impressions?.previous || 0)}
            </div>

            {/* Engagement */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="h-4 w-4" />
                <span>Engagement</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(pageInsights?.engagement?.value || 0)}
              </p>
              {getChangeIndicator(pageInsights?.engagement?.value || 0, pageInsights?.engagement?.previous || 0)}
            </div>

            {/* Page Views */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MousePointer className="h-4 w-4" />
                <span>Page Views</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(pageInsights?.page_views?.value || 0)}
              </p>
              {getChangeIndicator(pageInsights?.page_views?.value || 0, pageInsights?.page_views?.previous || 0)}
            </div>

            {/* Followers */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>Followers</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(pageInsights?.fan_count?.value || 0)}
              </p>
              {getChangeIndicator(pageInsights?.fan_count?.value || 0, pageInsights?.fan_count?.previous || 0)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Posts Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Posts Performance
            {selectedAccount && (
              <Badge variant="outline" className="ml-2 text-xs">
                {selectedAccount.display_name || selectedAccount.username}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Engagement metrics for your latest Facebook posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="mx-auto h-8 w-8 mb-2 text-gray-300" />
              <p className="text-sm">No recent posts with insights available</p>
              <p className="text-xs mt-1">Post content to see performance metrics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {post.message?.slice(0, 100)}...
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(post.created_time).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {post.media_type?.toUpperCase() || 'STATUS'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-gray-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.impressions || 0)}</span>
                      <span className="text-xs text-gray-500">reach</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3 text-blue-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.likes || 0)}</span>
                      <span className="text-xs text-gray-500">likes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-green-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.comments || 0)}</span>
                      <span className="text-xs text-gray-500">comments</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="h-3 w-3 text-purple-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.shares || 0)}</span>
                      <span className="text-xs text-gray-500">shares</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MousePointer className="h-3 w-3 text-orange-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.clicks || 0)}</span>
                      <span className="text-xs text-gray-500">clicks</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}