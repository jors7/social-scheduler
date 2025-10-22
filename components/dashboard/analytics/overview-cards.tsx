'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Eye, Heart, MessageCircle, TrendingUp, Users, ArrowUp, ArrowDown } from 'lucide-react'

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

interface TrendComparison {
  current: number
  previous: number
  change: number | null
}

interface TrendData {
  totalPosts: TrendComparison
  totalEngagement: TrendComparison
  totalReach: TrendComparison
  totalImpressions: TrendComparison
  engagementRate: TrendComparison
}

interface OverviewCardsProps {
  analyticsData: AnalyticsData | null
  trendData?: TrendData | null
  dateRange?: string
}

export function OverviewCards({ analyticsData, trendData, dateRange = '7' }: OverviewCardsProps) {
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

  // Helper function to get trend info
  const getTrendInfo = (metricKey: keyof TrendData) => {
    if (!trendData || !trendData[metricKey]) {
      return null;
    }
    const trend = trendData[metricKey];
    // If change is null, don't show trend (no valid comparison)
    if (trend.change === null) {
      return null;
    }
    return {
      change: trend.change,
      isPositive: trend.change > 0,
      isNegative: trend.change < 0,
      isNeutral: trend.change === 0
    };
  };

  const cards = [
    {
      title: 'Total Posts',
      value: analyticsData.totalPosts.toLocaleString(),
      change: 'Active',
      changeType: analyticsData.totalPosts > 0 ? 'positive' as const : 'neutral' as const,
      icon: BarChart3,
      description: `${analyticsData.totalPosts} created`,
      color: '#3b82f6', // blue
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      iconColor: 'text-blue-600',
      trendKey: 'totalPosts' as keyof TrendData
    },
    {
      title: 'Engagement',
      value: analyticsData.totalEngagement.toLocaleString(),
      change: 'Growing',
      changeType: analyticsData.totalEngagement > 0 ? 'positive' as const : 'neutral' as const,
      icon: Heart,
      description: 'interactions',
      color: '#ef4444', // red
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      iconColor: 'text-red-600',
      trendKey: 'totalEngagement' as keyof TrendData
    },
    {
      title: 'Reach',
      value: analyticsData.totalReach > 999 ? `${(analyticsData.totalReach / 1000).toFixed(1)}k` : analyticsData.totalReach.toLocaleString(),
      change: 'Expanding',
      changeType: analyticsData.totalReach > 0 ? 'positive' as const : 'neutral' as const,
      icon: Users,
      description: 'unique accounts',
      color: '#8b5cf6', // purple
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-500',
      iconColor: 'text-purple-600',
      trendKey: 'totalReach' as keyof TrendData
    },
    {
      title: 'Impressions',
      value: analyticsData.totalImpressions > 999 ? `${(analyticsData.totalImpressions / 1000).toFixed(1)}k` : analyticsData.totalImpressions.toLocaleString(),
      change: 'Tracking',
      changeType: analyticsData.totalImpressions > 0 ? 'positive' as const : 'neutral' as const,
      icon: Eye,
      description: 'views',
      color: '#10b981', // green
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      iconColor: 'text-green-600',
      trendKey: 'totalImpressions' as keyof TrendData
    },
    {
      title: 'Engagement Rate',
      value: analyticsData.engagementRate > 0 ? `${analyticsData.engagementRate.toFixed(1)}%` : '—',
      change: 'Measuring',
      changeType: analyticsData.engagementRate > 2 ? 'positive' as const : 'neutral' as const,
      icon: TrendingUp,
      description: 'avg. rate',
      color: '#f59e0b', // orange
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500',
      iconColor: 'text-orange-600',
      trendKey: 'engagementRate' as keyof TrendData
    },
    {
      title: 'Top Platform',
      value: analyticsData.topPlatform !== 'N/A' ? analyticsData.topPlatform : '—',
      change: 'Leading',
      changeType: analyticsData.topPlatform !== 'N/A' ? 'positive' as const : 'neutral' as const,
      icon: MessageCircle,
      description: 'best performer',
      color: '#14b8a6', // teal
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-500',
      iconColor: 'text-teal-600',
      trendKey: null // Top platform doesn't have a trend
    }
  ]

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        const trendInfo = card.trendKey ? getTrendInfo(card.trendKey) : null

        return (
          <Card
            key={index}
            className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group cursor-pointer"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-4">
              <CardTitle className="text-xs sm:text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.iconColor} transition-transform duration-300 group-hover:scale-110`} />
            </CardHeader>
            <CardContent className="px-3 sm:px-4">
              <div className="text-lg sm:text-2xl font-bold">{card.value}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {card.description}
              </p>

              {/* Trend Indicator */}
              {trendInfo && !trendInfo.isNeutral && (
                <div className="flex items-center gap-1 mt-2">
                  {trendInfo.isPositive ? (
                    <ArrowUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-[10px] sm:text-xs font-medium ${
                    trendInfo.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.abs(trendInfo.change).toFixed(1)}%
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-gray-500">
                    vs last {dateRange} days
                  </span>
                </div>
              )}

              {/* Fallback for no trend data */}
              {!trendInfo && card.changeType === 'positive' && (
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