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
  Cloud,
  AtSign
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

      {/* Recent Posts Performance - Coming Soon */}
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
            <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
          </CardTitle>
          <CardDescription>
            Advanced analytics for your Bluesky posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Coming Soon Message */}
            <div className="text-center py-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <AtSign className="mx-auto h-16 w-16 text-blue-700 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Bluesky Analytics Coming Soon!</h3>
              <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                We&apos;re working on bringing you comprehensive Bluesky analytics.
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
                      <p className="font-medium text-sm">Post Impressions</p>
                      <p className="text-xs text-gray-500">Track your post reach</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Heart className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Engagement Metrics</p>
                      <p className="text-xs text-gray-500">Likes, reposts, quotes</p>
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
                      <p className="text-xs text-gray-500">Profile visits and interactions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Thread Analytics</p>
                      <p className="text-xs text-gray-500">Conversation engagement</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Quote className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Quote Post Insights</p>
                      <p className="text-xs text-gray-500">Track quoted engagement</p>
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
                    Bluesky&apos;s AT Protocol is still evolving. We&apos;re working on implementing 
                    analytics as the platform&apos;s API capabilities expand to include detailed metrics.
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