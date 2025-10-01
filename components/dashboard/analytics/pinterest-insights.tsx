'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  MousePointer,
  Eye,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Activity,
  RefreshCw,
  Pin
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PinterestMetrics {
  saves: number
  pin_clicks: number
  impressions: number
  outbound_clicks: number
}

interface PinterestPin {
  id: string
  title?: string
  description?: string
  link?: string
  created_at: string
  board_id?: string
  media_url?: string
  thumbnail_url?: string
  saves?: number
  pin_clicks?: number
  impressions?: number
  outbound_clicks?: number
  metrics?: PinterestMetrics
}

interface PinterestInsightsProps {
  className?: string
}

export function PinterestInsights({ className }: PinterestInsightsProps) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [recentPins, setRecentPins] = useState<PinterestPin[]>([])
  const [hasPinterestAccount, setHasPinterestAccount] = useState(false)
  const [pinterestAccounts, setPinterestAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [totalMetrics, setTotalMetrics] = useState({
    totalSaves: 0,
    totalPinClicks: 0,
    totalImpressions: 0,
    totalOutboundClicks: 0
  })

  const fetchPinterestInsights = async (accountId?: string) => {
    try {
      setLoading(true)

      // Check if Pinterest account is connected
      const accountResponse = await fetch('/api/social-accounts')
      if (accountResponse.ok) {
        const accounts = await accountResponse.json()
        const pinterestAccountsList = accounts.filter((acc: any) => acc.platform === 'pinterest' && acc.is_active)

        if (pinterestAccountsList.length === 0) {
          setHasPinterestAccount(false)
          return
        }

        setHasPinterestAccount(true)
        setPinterestAccounts(pinterestAccountsList)

        // Select account to use
        const accountToUse = accountId
          ? pinterestAccountsList.find((acc: any) => acc.id === accountId)
          : selectedAccount
          || pinterestAccountsList[0]

        setSelectedAccount(accountToUse)
      } else {
        return
      }

      // Fetch Pinterest analytics data
      const analyticsResponse = await fetch('/api/analytics/pinterest?days=30')
      if (analyticsResponse.ok) {
        const { metrics } = await analyticsResponse.json()

        if (metrics && metrics.posts) {
          setRecentPins(metrics.posts || [])

          // Calculate total metrics
          setTotalMetrics({
            totalSaves: metrics.posts.reduce((sum: number, pin: PinterestPin) => sum + (pin.saves || 0), 0),
            totalPinClicks: metrics.posts.reduce((sum: number, pin: PinterestPin) => sum + (pin.pin_clicks || 0), 0),
            totalImpressions: metrics.posts.reduce((sum: number, pin: PinterestPin) => sum + (pin.impressions || 0), 0),
            totalOutboundClicks: metrics.posts.reduce((sum: number, pin: PinterestPin) => sum + (pin.outbound_clicks || 0), 0)
          })
        }
      }
    } catch (error) {
      console.error('Error fetching Pinterest insights:', error)
      toast.error('Failed to load Pinterest insights')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPinterestInsights()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    fetchPinterestInsights()
  }

  if (!hasPinterestAccount) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pin className="h-5 w-5" />
            Pinterest Insights
          </CardTitle>
          <CardDescription>
            Connect your Pinterest account to view insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Pin className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No Pinterest account connected
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/settings'}>
              Connect Pinterest
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading && recentPins.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pin className="h-5 w-5" />
            Pinterest Insights
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
      {/* Overview Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Pinterest Overview
                {selectedAccount && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {selectedAccount.username || selectedAccount.platform_user_id}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Last 30 days performance metrics
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Saves</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.totalSaves)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MousePointer className="h-4 w-4 text-blue-500" />
                <span>Pin Clicks</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.totalPinClicks)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4 text-purple-500" />
                <span>Impressions</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.totalImpressions)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ExternalLink className="h-4 w-4 text-green-500" />
                <span>Outbound Clicks</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.totalOutboundClicks)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Pins Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Pins Performance
          </CardTitle>
          <CardDescription>
            Your top performing pins from the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentPins.length === 0 ? (
            <div className="text-center py-8">
              <Pin className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-sm text-gray-500">No pins found in the last 30 days</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPins
                .sort((a, b) => {
                  const aEngagement = (a.saves || 0) + (a.pin_clicks || 0) + (a.outbound_clicks || 0)
                  const bEngagement = (b.saves || 0) + (b.pin_clicks || 0) + (b.outbound_clicks || 0)
                  return bEngagement - aEngagement
                })
                .slice(0, 10)
                .map((pin) => {
                  const totalEngagement = (pin.saves || 0) + (pin.pin_clicks || 0) + (pin.outbound_clicks || 0)

                  return (
                    <div
                      key={pin.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {/* Pin Thumbnail - 64x64px */}
                        <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                          {pin.thumbnail_url || pin.media_url ? (
                            <img
                              src={pin.thumbnail_url || pin.media_url}
                              alt={pin.title || pin.description || 'Pin'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
                              <Pin className="h-8 w-8 text-red-400" />
                            </div>
                          )}
                        </div>

                        {/* Pin Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-semibold text-sm line-clamp-2 flex-1">
                              {pin.title || pin.description || 'Untitled Pin'}
                            </h4>
                            <div className="ml-2 flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full">
                              <TrendingUp className="h-3 w-3" />
                              <span className="text-xs font-semibold">{formatNumber(totalEngagement)}</span>
                            </div>
                          </div>
                          {pin.description && pin.title && (
                            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{pin.description}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {new Date(pin.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                            <Heart className="h-3 w-3" />
                            <span className="text-xs font-semibold">{formatNumber(pin.saves || 0)}</span>
                          </div>
                          <p className="text-[10px] text-gray-500">Saves</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                            <MousePointer className="h-3 w-3" />
                            <span className="text-xs font-semibold">{formatNumber(pin.pin_clicks || 0)}</span>
                          </div>
                          <p className="text-[10px] text-gray-500">Clicks</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                            <Eye className="h-3 w-3" />
                            <span className="text-xs font-semibold">{formatNumber(pin.impressions || 0)}</span>
                          </div>
                          <p className="text-[10px] text-gray-500">Views</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                            <ExternalLink className="h-3 w-3" />
                            <span className="text-xs font-semibold">{formatNumber(pin.outbound_clicks || 0)}</span>
                          </div>
                          <p className="text-[10px] text-gray-500">Links</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
