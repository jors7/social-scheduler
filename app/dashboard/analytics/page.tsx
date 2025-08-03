'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OverviewCards } from '@/components/dashboard/analytics/overview-cards'
import { EngagementChart } from '@/components/dashboard/analytics/engagement-chart'
import { PlatformBreakdown } from '@/components/dashboard/analytics/platform-breakdown'
import { TopPosts } from '@/components/dashboard/analytics/top-posts'
import { ReachChart } from '@/components/dashboard/analytics/reach-chart'
import { CalendarDays, Download, Filter } from 'lucide-react'

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d')

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' }
  ]

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Track your social media performance across all platforms
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-4 w-4" />
            <select 
              className="bg-background border border-input rounded-md px-3 py-2 text-sm"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <OverviewCards />

      <div className="grid gap-8 md:grid-cols-2">
        {/* Engagement Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Engagement Over Time</CardTitle>
            <CardDescription>
              Track likes, comments, and shares across all platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EngagementChart />
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <CardDescription>
              Compare engagement rates by platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlatformBreakdown />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Reach Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Reach & Impressions</CardTitle>
            <CardDescription>
              Monitor your content reach and impressions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReachChart />
          </CardContent>
        </Card>

        {/* Top Posts */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Performing Posts</CardTitle>
            <CardDescription>
              Your best content from the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopPosts />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}