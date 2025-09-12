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

      {/* Recent Posts Performance - Coming Soon */}
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
            <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
          </CardTitle>
          <CardDescription>
            Advanced analytics for your Twitter posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Coming Soon Message */}
            <div className="text-center py-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <Twitter className="mx-auto h-16 w-16 text-blue-700 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Twitter Analytics Coming Soon!</h3>
              <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                We&apos;re working on bringing you comprehensive Twitter analytics.
              </p>
            </div>

            {/* What to Expect */}
            <div className="border rounded-lg p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                What Analytics Will Be Available
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Eye className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Tweet Impressions</p>
                      <p className="text-xs text-gray-500">Track your tweet reach</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Heart className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Engagement Metrics</p>
                      <p className="text-xs text-gray-500">Likes, retweets, replies</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Follower Analytics</p>
                      <p className="text-xs text-gray-500">Growth and demographics</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Activity className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Profile Performance</p>
                      <p className="text-xs text-gray-500">Profile visits and clicks</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Conversation Insights</p>
                      <p className="text-xs text-gray-500">Mentions and replies analysis</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Bookmark className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Bookmark Analytics</p>
                      <p className="text-xs text-gray-500">Save rates and trends</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Why is this feature pending?</p>
                  <p className="text-blue-700">
                    Twitter&apos;s API pricing model makes real-time analytics cost-prohibitive for most applications. 
                    We&apos;re exploring alternative solutions to bring you Twitter insights at an affordable price.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}