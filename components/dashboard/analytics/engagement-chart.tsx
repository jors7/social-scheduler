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
    return <div className="h-[250px] sm:h-[300px] animate-pulse bg-gray-200 rounded"></div>
  }
  
  // Generate chart data from posted posts - group by date
  const dataMap = new Map<string, any>()
  
  analyticsData.postedPosts.forEach(post => {
    if (!post.posted_at) return // Skip posts without posted_at
    
    let likes = 0
    let comments = 0
    let shares = 0
    
    if (post.post_results && Array.isArray(post.post_results)) {
      post.post_results.forEach((result: any) => {
        if (result.success && result.data?.metrics) {
          const metrics = result.data.metrics
          likes += metrics.likes || 0
          
          // Handle platform-specific metrics
          if (result.platform === 'threads') {
            // Threads uses replies instead of comments
            comments += metrics.replies || 0
            // Threads uses reposts and quotes instead of shares
            shares += (metrics.reposts || 0) + (metrics.quotes || 0)
          } else {
            comments += metrics.comments || 0
            shares += metrics.shares || 0
          }
        }
      })
    }
    
    const date = new Date(post.posted_at)
    const dateKey = date.toISOString().split('T')[0] // Use YYYY-MM-DD as key
    
    // Format date consistently
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    const dateLabel = `${month} ${day}`
    
    if (dataMap.has(dateKey)) {
      const existing = dataMap.get(dateKey)
      existing.likes += likes
      existing.comments += comments
      existing.shares += shares
      existing.total += likes + comments + shares
    } else {
      dataMap.set(dateKey, {
        date: dateLabel,
        dateKey, // Keep the key for debugging
        likes,
        comments,
        shares,
        total: likes + comments + shares,
        timestamp: date.getTime()
      })
    }
  })
  
  // Convert map to array and sort
  let data = Array.from(dataMap.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-30) // Last 30 data points
  
  // Remove any remaining duplicates by date label (shouldn't happen but just in case)
  const seenDates = new Set<string>()
  data = data.filter(item => {
    if (seenDates.has(item.date)) {
      return false
    }
    seenDates.add(item.date)
    return true
  })
  
  if (data.length === 0) {
    return (
      <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">💬</div>
          <p className="text-xs sm:text-sm">No engagement data available</p>
          <p className="text-[10px] sm:text-xs text-gray-400">Publish posts to see engagement trends</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[250px] sm:h-[300px] w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <XAxis 
            dataKey="date" 
            stroke="#888888"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            interval={data.length <= 6 ? 0 : Math.floor(data.length / 4)}
            angle={0}
            textAnchor="middle"
          />
          <YAxis
            stroke="#888888"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
            width={35}
            tick={{ fontSize: 10 }}
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