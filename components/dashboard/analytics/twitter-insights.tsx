'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Bookmark, 
  Eye, 
  Users, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  Info,
  Twitter,
  Quote
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TwitterMetrics {
  views: number
  likes: number
  retweets: number
  replies: number
  quotes: number
  bookmarks: number
}

interface TwitterPost {
  id: string
  text: string
  created_at: string
  permalink_url: string
  media_type: string
  media_url?: string
  metrics?: TwitterMetrics
}

interface TwitterInsightsProps {
  className?: string
}

export function TwitterInsights({ className }: TwitterInsightsProps) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [profileInsights, setProfileInsights] = useState<any>(null)
  const [recentPosts, setRecentPosts] = useState<TwitterPost[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'days_28'>('week')
  const [hasTwitterAccount, setHasTwitterAccount] = useState(false)
  const [twitterAccounts, setTwitterAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)

  const fetchTwitterInsights = async (accountId?: string) => {
    try {
      setLoading(true)
      
      // Check if Twitter account is connected
      const accountResponse = await fetch('/api/social-accounts')
      if (accountResponse.ok) {
        const accounts = await accountResponse.json()
        const twitterAccountsList = accounts.filter((acc: any) => acc.platform === 'twitter' && acc.is_active)
        
        if (twitterAccountsList.length === 0) {
          setHasTwitterAccount(false)
          return
        }
        
        setHasTwitterAccount(true)
        setTwitterAccounts(twitterAccountsList)
        
        // Select account to use
        const accountToUse = accountId 
          ? twitterAccountsList.find((acc: any) => acc.id === accountId) 
          : selectedAccount 
          || twitterAccountsList[0]
        
        setSelectedAccount(accountToUse)
      } else {
        return
      }

      // Simulated profile-level insights (Twitter API v2 analytics requires expensive access)
      const insights = {
        followers: { 
          value: Math.floor(Math.random() * 5000) + 1000,
          previous: Math.floor(Math.random() * 4800) + 950
        },
        following: { 
          value: Math.floor(Math.random() * 1000) + 200,
          previous: Math.floor(Math.random() * 980) + 195
        },
        tweets: { 
          value: Math.floor(Math.random() * 100) + 50,
          previous: Math.floor(Math.random() * 95) + 45
        },
        impressions: { 
          value: Math.floor(Math.random() * 10000) + 5000,
          previous: Math.floor(Math.random() * 9500) + 4800
        },
        engagement_rate: { 
          value: Math.random() * 8 + 2, // 2-10% engagement rate
          previous: Math.random() * 8 + 1.5
        },
        profile_clicks: {
          value: Math.floor(Math.random() * 500) + 100,
          previous: Math.floor(Math.random() * 480) + 90
        }
      }
      setProfileInsights(insights)

      // Get recent posted Twitter posts from database
      const supabaseResponse = await fetch('/api/dashboard/analytics')
      if (supabaseResponse.ok) {
        const data = await supabaseResponse.json()
        const posts = data.posts || []
        
        // Filter for Twitter posts
        const twitterPosts = posts.filter((post: any) => 
          post.platforms && Array.isArray(post.platforms) && 
          post.platforms.some((p: string) => p.toLowerCase() === 'twitter')
        ).slice(0, 5)

        // Process posts with simulated metrics
        const processedPosts = twitterPosts.map((post: any) => {
          const twitterResult = post.post_results?.find((r: any) => r.platform === 'twitter')
          
          return {
            id: twitterResult?.postId || post.id,
            text: post.content || '',
            created_at: post.posted_at || post.scheduled_for,
            permalink_url: twitterResult?.data?.permalink || '#',
            media_type: post.media_urls?.length > 0 ? 'IMAGE' : 'TEXT',
            media_url: post.media_urls?.[0],
            metrics: {
              views: Math.floor(Math.random() * 5000),
              likes: Math.floor(Math.random() * 200),
              retweets: Math.floor(Math.random() * 50),
              replies: Math.floor(Math.random() * 30),
              quotes: Math.floor(Math.random() * 10),
              bookmarks: Math.floor(Math.random() * 20)
            }
          }
        })
        
        setRecentPosts(processedPosts)
      }
    } catch (error) {
      console.error('Error fetching Twitter insights:', error)
      toast.error('Failed to load Twitter insights')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Add a small delay to prevent rapid re-renders
    const timer = setTimeout(() => {
      fetchTwitterInsights()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [selectedPeriod])

  const handleRefresh = async () => {
    setRefreshing(true)
    
    // First update all Twitter post metrics in the database
    try {
      const updateResponse = await fetch('/api/twitter/update-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (updateResponse.ok) {
        const result = await updateResponse.json()
        console.log('Updated Twitter metrics:', result)
        toast.info('Twitter metrics refreshed (simulated data)')
      }
    } catch (error) {
      console.error('Error updating metrics:', error)
    }
    
    // Then fetch the insights
    fetchTwitterInsights()
  }

  if (!hasTwitterAccount) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5" />
            Twitter/X Insights
          </CardTitle>
          <CardDescription>
            Connect your Twitter/X account to view insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Twitter className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No Twitter/X account connected
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/settings'}>
              Connect Twitter
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading && !profileInsights) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5" />
            Twitter/X Insights
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

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`
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
      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Twitter className="h-5 w-5" />
                Twitter/X Insights
                {selectedAccount && (
                  <Badge variant="secondary" className="ml-2">
                    @{selectedAccount.username}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedAccount 
                  ? `Analytics for @${selectedAccount.username}`
                  : 'Performance metrics for your Twitter/X account'}
                <Badge variant="outline" className="ml-2 text-xs">
                  Note: Twitter API v2 analytics requires expensive access. Showing simulated data.
                </Badge>
              </CardDescription>
              {twitterAccounts.length > 1 && (
                <div className="mt-2">
                  <select
                    className="text-sm border rounded-lg px-3 py-1.5 bg-white"
                    value={selectedAccount?.id || ''}
                    onChange={(e) => {
                      const account = twitterAccounts.find(acc => acc.id === e.target.value)
                      if (account) {
                        setSelectedAccount(account)
                        fetchTwitterInsights(account.id)
                      }
                    }}
                  >
                    {twitterAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        @{account.username}
                      </option>
                    ))}
                  </select>
                  <span className="ml-2 text-xs text-gray-500">
                    Switch between {twitterAccounts.length} connected accounts
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
            {/* Followers */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>Followers</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(profileInsights?.followers?.value || 0)}
              </p>
              {getChangeIndicator(profileInsights?.followers?.value || 0, profileInsights?.followers?.previous || 0)}
            </div>

            {/* Impressions */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4" />
                <span>Impressions</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(profileInsights?.impressions?.value || 0)}
              </p>
              {getChangeIndicator(profileInsights?.impressions?.value || 0, profileInsights?.impressions?.previous || 0)}
            </div>

            {/* Profile Clicks */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="h-4 w-4" />
                <span>Profile Clicks</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(profileInsights?.profile_clicks?.value || 0)}
              </p>
              {getChangeIndicator(profileInsights?.profile_clicks?.value || 0, profileInsights?.profile_clicks?.previous || 0)}
            </div>

            {/* Engagement Rate */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4" />
                <span>Engagement Rate</span>
              </div>
              <p className="text-2xl font-bold">
                {formatPercentage(profileInsights?.engagement_rate?.value || 0)}
              </p>
              {getChangeIndicator(profileInsights?.engagement_rate?.value || 0, profileInsights?.engagement_rate?.previous || 0)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Posts Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Tweets Performance
            {selectedAccount && (
              <Badge variant="outline" className="ml-2 text-xs">
                @{selectedAccount.username}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Engagement metrics for your latest tweets
            <Badge variant="secondary" className="ml-2 text-xs">
              Simulated data - Twitter API read-only
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="mx-auto h-8 w-8 mb-2 text-gray-300" />
              <p className="text-sm">No recent tweets with insights available</p>
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
                      {post.media_type?.toUpperCase() || 'TWEET'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-gray-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.views || 0)}</span>
                      <span className="text-xs text-gray-500">views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-red-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.likes || 0)}</span>
                      <span className="text-xs text-gray-500">likes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Repeat2 className="h-3 w-3 text-green-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.retweets || 0)}</span>
                      <span className="text-xs text-gray-500">retweets</span>
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
                    <div className="flex items-center gap-1">
                      <Bookmark className="h-3 w-3 text-orange-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.bookmarks || 0)}</span>
                      <span className="text-xs text-gray-500">bookmarks</span>
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