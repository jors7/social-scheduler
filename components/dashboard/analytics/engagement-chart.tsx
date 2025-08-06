'use client'

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

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

interface EngagementChartProps {
  analyticsData: AnalyticsData | null
}

export function EngagementChart({ analyticsData }: EngagementChartProps) {
  if (!analyticsData) {
    return <div className="h-[300px] animate-pulse bg-gray-200 rounded"></div>
  }
  
  // Generate chart data from posted posts
  const data = analyticsData.postedPosts
    .map(post => {
      let likes = 0
      let comments = 0
      let shares = 0
      
      if (post.post_results && Array.isArray(post.post_results)) {
        post.post_results.forEach((result: any) => {
          if (result.success && result.data?.metrics) {
            likes += result.data.metrics.likes || 0
            comments += result.data.metrics.comments || 0
            shares += result.data.metrics.shares || 0
          }
        })
      }
      
      return {
        date: new Date(post.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        likes,
        comments,
        shares,
        total: likes + comments + shares,
        timestamp: new Date(post.posted_at).getTime()
      }
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-30) // Last 30 data points
  
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-sm">No engagement data available</p>
          <p className="text-xs text-gray-400">Publish posts to see engagement trends</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
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
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-md">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          {label}
                        </span>
                        <span className="font-bold text-muted-foreground">
                          Total: {payload[0]?.payload?.total}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-xs">Likes: {payload[0]?.payload?.likes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-xs">Comments: {payload[0]?.payload?.comments}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span className="text-xs">Shares: {payload[0]?.payload?.shares}</span>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Line
            type="monotone"
            dataKey="likes"
            strokeWidth={2}
            stroke="#3b82f6"
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="comments"
            strokeWidth={2}
            stroke="#10b981"
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="shares"
            strokeWidth={2}
            stroke="#f59e0b"
            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}