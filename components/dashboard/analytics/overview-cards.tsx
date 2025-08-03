'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAnalyticsOverview } from '@/lib/mock-analytics'
import { BarChart3, Eye, Heart, MessageCircle, TrendingUp, Users } from 'lucide-react'

export function OverviewCards() {
  const data = getAnalyticsOverview()

  const cards = [
    {
      title: 'Total Posts',
      value: data.totalPosts.toLocaleString(),
      change: '+12%',
      changeType: 'positive' as const,
      icon: BarChart3,
      description: 'vs last month'
    },
    {
      title: 'Total Engagement',
      value: data.totalEngagement.toLocaleString(),
      change: '+23%',
      changeType: 'positive' as const,
      icon: Heart,
      description: 'likes, comments, shares'
    },
    {
      title: 'Total Reach',
      value: data.totalReach.toLocaleString(),
      change: '+8%',
      changeType: 'positive' as const,
      icon: Users,
      description: 'unique accounts reached'
    },
    {
      title: 'Impressions',
      value: data.totalImpressions.toLocaleString(),
      change: '+15%',
      changeType: 'positive' as const,
      icon: Eye,
      description: 'total views'
    },
    {
      title: 'Engagement Rate',
      value: `${data.engagementRate}%`,
      change: '+0.3%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      description: 'average across platforms'
    },
    {
      title: 'Top Platform',
      value: data.topPlatform,
      change: 'Leading',
      changeType: 'neutral' as const,
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