'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Quote, 
  Eye, 
  Users, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  Info,
  Cloud
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BlueskyMetrics {
  likes: number
  reposts: number
  replies: number
  quotes: number
  views: number
  bookmarks: number
}

interface BlueskyPost {
  id: string
  uri?: string
  text: string
  created_at: string
  permalink_url: string
  media_type: string
  media_url?: string
  metrics?: BlueskyMetrics
}

interface BlueskyInsightsProps {
  className?: string
}

export function BlueskyInsights({ className }: BlueskyInsightsProps) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [recentPosts, setRecentPosts] = useState<BlueskyPost[]>([])
  const [hasBlueskyAccount, setHasBlueskyAccount] = useState(false)
  const [blueskyAccounts, setBlueskyAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [totalMetrics, setTotalMetrics] = useState({
    totalLikes: 0,
    totalReposts: 0,
    totalReplies: 0,
    totalQuotes: 0
  })

  const fetchBlueskyInsights = async (accountId?: string) => {
    try {
      setLoading(true)
      
      // Check if Bluesky account is connected
      const accountResponse = await fetch('/api/social-accounts')
      if (accountResponse.ok) {
        const accounts = await accountResponse.json()
        const blueskyAccountsList = accounts.filter((acc: any) => acc.platform === 'bluesky' && acc.is_active)
        
        if (blueskyAccountsList.length === 0) {
          setHasBlueskyAccount(false)
          return
        }
        
        setHasBlueskyAccount(true)
        setBlueskyAccounts(blueskyAccountsList)
        
        // Select account to use
        const accountToUse = accountId 
          ? blueskyAccountsList.find((acc: any) => acc.id === accountId) 
          : selectedAccount 
          || blueskyAccountsList[0]
        
        setSelectedAccount(accountToUse)
      } else {
        return
      }

      // Fetch recent posts from Bluesky
      const postsQueryParams = new URLSearchParams({
        limit: '10',
        ...(selectedAccount?.id && { accountId: selectedAccount.id })
      })
      const postsResponse = await fetch(`/api/bluesky/posts?${postsQueryParams}`)
      if (postsResponse.ok) {
        const { media } = await postsResponse.json()
        setRecentPosts(media || [])
        
        // Calculate total metrics
        if (media && media.length > 0) {
          const totals = media.reduce((acc: any, post: BlueskyPost) => ({
            totalLikes: acc.totalLikes + (post.metrics?.likes || 0),
            totalReposts: acc.totalReposts + (post.metrics?.reposts || 0),
            totalReplies: acc.totalReplies + (post.metrics?.replies || 0),
            totalQuotes: acc.totalQuotes + (post.metrics?.quotes || 0)
          }), {
            totalLikes: 0,
            totalReposts: 0,
            totalReplies: 0,
            totalQuotes: 0
          })
          setTotalMetrics(totals)
        }
      }
    } catch (error) {
      console.error('Error fetching Bluesky insights:', error)
      toast.error('Failed to load Bluesky insights')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Add a small delay to prevent rapid re-renders
    const timer = setTimeout(() => {
      fetchBlueskyInsights()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    
    // First update all Bluesky post metrics in the database
    try {
      const updateResponse = await fetch('/api/bluesky/update-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (updateResponse.ok) {
        const result = await updateResponse.json()
        console.log('Updated Bluesky metrics:', result)
        if (result.updatedCount > 0) {
          toast.success(`Updated metrics for ${result.updatedCount} posts`)
        }
      }
    } catch (error) {
      console.error('Error updating metrics:', error)
    }
    
    // Then fetch the insights
    fetchBlueskyInsights()
  }

  if (!hasBlueskyAccount) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Bluesky Insights
          </CardTitle>
          <CardDescription>
            Connect your Bluesky account to view insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Cloud className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No Bluesky account connected
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/settings'}>
              Connect Bluesky
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading && recentPosts.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Bluesky Insights
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

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Bluesky Insights
                {selectedAccount && (
                  <Badge variant="secondary" className="ml-2">
                    @{selectedAccount.username}.bsky.social
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedAccount 
                  ? `Analytics for @${selectedAccount.username}.bsky.social`
                  : 'Performance metrics for your Bluesky account'}
              </CardDescription>
              {blueskyAccounts.length > 1 && (
                <div className="mt-2">
                  <select
                    className="text-sm border rounded-lg px-3 py-1.5 bg-white"
                    value={selectedAccount?.id || ''}
                    onChange={(e) => {
                      const account = blueskyAccounts.find(acc => acc.id === e.target.value)
                      if (account) {
                        setSelectedAccount(account)
                        fetchBlueskyInsights(account.id)
                      }
                    }}
                  >
                    {blueskyAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        @{account.username}.bsky.social
                      </option>
                    ))}
                  </select>
                  <span className="ml-2 text-xs text-gray-500">
                    Switch between {blueskyAccounts.length} connected accounts
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
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
            {/* Total Likes */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Heart className="h-4 w-4" />
                <span>Total Likes</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.totalLikes)}
              </p>
              <p className="text-xs text-gray-500">
                From {recentPosts.length} recent posts
              </p>
            </div>

            {/* Total Reposts */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Repeat2 className="h-4 w-4" />
                <span>Total Reposts</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.totalReposts)}
              </p>
              <p className="text-xs text-gray-500">
                Shared by others
              </p>
            </div>

            {/* Total Replies */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageCircle className="h-4 w-4" />
                <span>Total Replies</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.totalReplies)}
              </p>
              <p className="text-xs text-gray-500">
                Conversations started
              </p>
            </div>

            {/* Total Quotes */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Quote className="h-4 w-4" />
                <span>Total Quotes</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.totalQuotes)}
              </p>
              <p className="text-xs text-gray-500">
                Quote posts created
              </p>
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
                @{selectedAccount.username}.bsky.social
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Engagement metrics for your latest Bluesky posts
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
                        {post.text?.slice(0, 100)}...
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {post.media_type?.toUpperCase() || 'POST'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-red-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.likes || 0)}</span>
                      <span className="text-xs text-gray-500">likes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Repeat2 className="h-3 w-3 text-green-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.reposts || 0)}</span>
                      <span className="text-xs text-gray-500">reposts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-blue-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.replies || 0)}</span>
                      <span className="text-xs text-gray-500">replies</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Quote className="h-3 w-3 text-purple-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.quotes || 0)}</span>
                      <span className="text-xs text-gray-500">quotes</span>
                    </div>
                  </div>
                  
                  {post.permalink_url && post.permalink_url !== '#' && (
                    <div className="mt-3 pt-3 border-t">
                      <a 
                        href={post.permalink_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View on Bluesky →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}