'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

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

interface ReachChartProps {
  analyticsData: AnalyticsData | null
}

export function ReachChart({ analyticsData }: ReachChartProps) {
  if (!analyticsData) {
    return <div className="h-[300px] animate-pulse bg-gray-200 rounded"></div>
  }
  
  // Generate chart data from posted posts
  const chartData = analyticsData.postedPosts
    .map(post => {
      let reach = 0
      let impressions = 0
      
      if (post.post_results && Array.isArray(post.post_results)) {
        post.post_results.forEach((result: any) => {
          if (result.success && result.data?.metrics) {
            reach += result.data.metrics.views || result.data.metrics.impressions || 0
            impressions += result.data.metrics.views || result.data.metrics.impressions || 0
          }
        })
      }
      
      return {
        date: new Date(post.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        reach,
        impressions,
        timestamp: new Date(post.posted_at).getTime()
      }
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-30) // Last 30 data points
  
  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">📈</div>
          <p className="text-sm">No reach data available</p>
          <p className="text-xs text-gray-400">Publish posts to see reach trends</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="impressionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md">
                      <div className="text-sm font-medium mb-1">{label}</div>
                      <div className="grid grid-cols-1 gap-1 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span>Reach: {payload[0]?.value?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span>Impressions: {payload[1]?.value?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="reach"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#reachGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="impressions"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#impressionsGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>Reach</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>Impressions</span>
        </div>
      </div>
    </div>
  )
}