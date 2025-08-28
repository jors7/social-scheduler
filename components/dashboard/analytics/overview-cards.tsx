'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Eye, Heart, MessageCircle, TrendingUp, Users } from 'lucide-react'

interface AnalyticsData {
  totalPosts: number
  totalEngagement: number
  totalReach: number
  totalImpressions: number
  engagementRate: number
  topPlatform: string
  postedPosts: any[]
  platformStats: Record<string, any>
}

interface OverviewCardsProps {
  analyticsData: AnalyticsData | null
}

export function OverviewCards({ analyticsData }: OverviewCardsProps) {
  if (!analyticsData) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2 px-3 sm:px-4">
              <div className="h-3 sm:h-4 bg-gray-200 rounded w-16 sm:w-24"></div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4">
              <div className="h-6 sm:h-8 bg-gray-200 rounded w-12 sm:w-16 mb-1 sm:mb-2"></div>
              <div className="h-2 sm:h-3 bg-gray-200 rounded w-20 sm:w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Total Posts',
      value: analyticsData.totalPosts.toLocaleString(),
      change: 'Active',
      changeType: analyticsData.totalPosts > 0 ? 'positive' as const : 'neutral' as const,
      icon: BarChart3,
      description: `${analyticsData.totalPosts} created`
    },
    {
      title: 'Engagement',
      value: analyticsData.totalEngagement.toLocaleString(),
      change: 'Growing',
      changeType: analyticsData.totalEngagement > 0 ? 'positive' as const : 'neutral' as const,
      icon: Heart,
      description: 'interactions'
    },
    {
      title: 'Reach',
      value: analyticsData.totalReach > 999 ? `${(analyticsData.totalReach / 1000).toFixed(1)}k` : analyticsData.totalReach.toLocaleString(),
      change: 'Expanding',
      changeType: analyticsData.totalReach > 0 ? 'positive' as const : 'neutral' as const,
      icon: Users,
      description: 'unique accounts'
    },
    {
      title: 'Impressions',
      value: analyticsData.totalImpressions > 999 ? `${(analyticsData.totalImpressions / 1000).toFixed(1)}k` : analyticsData.totalImpressions.toLocaleString(),
      change: 'Tracking',
      changeType: analyticsData.totalImpressions > 0 ? 'positive' as const : 'neutral' as const,
      icon: Eye,
      description: 'views'
    },
    {
      title: 'Engagement',
      value: analyticsData.engagementRate > 0 ? `${analyticsData.engagementRate.toFixed(1)}%` : '—',
      change: 'Measuring',
      changeType: analyticsData.engagementRate > 2 ? 'positive' as const : 'neutral' as const,
      icon: TrendingUp,
      description: 'avg. rate'
    },
    {
      title: 'Top Platform',
      value: analyticsData.topPlatform !== 'N/A' ? analyticsData.topPlatform : '—',
      change: 'Leading',
      changeType: analyticsData.topPlatform !== 'N/A' ? 'positive' as const : 'neutral' as const,
      icon: MessageCircle,
      description: 'best performer'
    }
  ]

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-4">
              <CardTitle className="text-xs sm:text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 sm:px-4">
              <div className="text-lg sm:text-2xl font-bold">{card.value}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
              {card.changeType === 'positive' && (
                <div className="flex items-center gap-1 mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] sm:text-xs text-green-600 font-medium">
                    {card.change}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}