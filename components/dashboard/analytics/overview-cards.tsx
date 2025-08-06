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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
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
      change: analyticsData.totalPosts > 0 ? `${analyticsData.totalPosts} created` : 'No posts yet',
      changeType: analyticsData.totalPosts > 0 ? 'neutral' as const : 'neutral' as const,
      icon: BarChart3,
      description: 'drafts & published'
    },
    {
      title: 'Total Engagement',
      value: analyticsData.totalEngagement.toLocaleString(),
      change: analyticsData.totalEngagement > 0 ? 'From posted content' : 'No engagement yet',
      changeType: analyticsData.totalEngagement > 0 ? 'positive' as const : 'neutral' as const,
      icon: Heart,
      description: 'likes, comments, shares'
    },
    {
      title: 'Total Reach',
      value: analyticsData.totalReach.toLocaleString(),
      change: analyticsData.postedPosts.length > 0 ? `${analyticsData.postedPosts.length} posts published` : 'No posts published',
      changeType: analyticsData.totalReach > 0 ? 'positive' as const : 'neutral' as const,
      icon: Users,
      description: 'accounts reached'
    },
    {
      title: 'Impressions',
      value: analyticsData.totalImpressions.toLocaleString(),
      change: analyticsData.totalImpressions > 0 ? 'Content views' : 'No views yet',
      changeType: analyticsData.totalImpressions > 0 ? 'positive' as const : 'neutral' as const,
      icon: Eye,
      description: 'total views'
    },
    {
      title: 'Engagement Rate',
      value: analyticsData.engagementRate > 0 ? `${analyticsData.engagementRate.toFixed(1)}%` : '0%',
      change: analyticsData.totalReach > 0 ? 'Real performance' : 'Need more posts',
      changeType: analyticsData.engagementRate > 0 ? 'positive' as const : 'neutral' as const,
      icon: TrendingUp,
      description: 'average rate'
    },
    {
      title: 'Top Platform',
      value: analyticsData.topPlatform,
      change: analyticsData.topPlatform !== 'N/A' ? 'Best performer' : 'No data',
      changeType: analyticsData.topPlatform !== 'N/A' ? 'positive' as const : 'neutral' as const,
      icon: MessageCircle,
      description: 'by engagement'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span 
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    card.changeType === 'positive' 
                      ? 'bg-green-100 text-green-800' 
                      : card.changeType === 'neutral'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {card.change}
                </span>
                <span>{card.description}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}