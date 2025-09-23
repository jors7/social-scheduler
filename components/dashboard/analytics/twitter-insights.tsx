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
  Quote,
  MousePointer,
  Calendar,
  ExternalLink,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TwitterInsightsProps {
  className?: string
}

export function TwitterInsights({ className }: TwitterInsightsProps) {
  const [hasTwitterAccount, setHasTwitterAccount] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkTwitterAccount = async () => {
      try {
        const accountResponse = await fetch('/api/social-accounts')
        if (accountResponse.ok) {
          const accounts = await accountResponse.json()
          const twitterAccountsList = accounts.filter((acc: any) => acc.platform === 'twitter' && acc.is_active)
          
          if (twitterAccountsList.length > 0) {
            setHasTwitterAccount(true)
            setSelectedAccount(twitterAccountsList[0])
          } else {
            setHasTwitterAccount(false)
          }
        }
      } catch (error) {
        console.error('Error checking Twitter account:', error)
      } finally {
        setLoading(false)
      }
    }

    checkTwitterAccount()
  }, [])


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

  if (loading) {
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

  // Coming Soon state for connected accounts (due to API limitations)
  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Coming Soon Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5" />
            Twitter/X Analytics
            {selectedAccount && (
              <Badge variant="outline" className="ml-2 text-xs">
                @{selectedAccount.username}
              </Badge>
            )}
            <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
          </CardTitle>
          <CardDescription>
            Advanced analytics for your Twitter/X posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Coming Soon Message */}
            <div className="text-center py-8 bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg">
              <Twitter className="mx-auto h-16 w-16 text-black mb-4" />
              <h3 className="text-lg font-semibold mb-2">Twitter Analytics Coming Soon!</h3>
              <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                We&apos;re working on bringing you comprehensive Twitter analytics to help you 
                track your performance and optimize your content strategy.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                Premium Feature In Development
              </div>
            </div>

            {/* What Analytics Will Be Available */}
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
                      <p className="text-xs text-gray-500">Track your tweet reach and visibility</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Heart className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Engagement Metrics</p>
                      <p className="text-xs text-gray-500">Likes, retweets, replies, quotes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <BarChart3 className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Performance Tracking</p>
                      <p className="text-xs text-gray-500">Monitor tweet performance over time</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Activity className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Engagement Rate</p>
                      <p className="text-xs text-gray-500">Calculate and track engagement rates</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Top Performing Content</p>
                      <p className="text-xs text-gray-500">Identify your best tweets</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Bookmark className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Bookmark Analytics</p>
                      <p className="text-xs text-gray-500">Track saves and bookmarks</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coming Soon Timeline */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="font-medium text-blue-900">What to expect:</p>
                  <ul className="text-blue-700 space-y-1 list-disc list-inside">
                    <li>Real-time tweet performance tracking</li>
                    <li>Historical data analysis and trends</li>
                    <li>Automated insights and recommendations</li>
                  </ul>
                  <p className="text-blue-600 mt-2">
                    Stay tuned for updates on this exciting new feature!
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