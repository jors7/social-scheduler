'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, Calendar, Eye, Activity } from 'lucide-react'

interface AnalyticsData {
  totalPosts: number
  totalEngagement: number
  totalReach: number
  totalImpressions: number
  engagementRate: number
  topPlatform: string
  allPosts: any[]
  platformStats: Record<string, any>
}

interface ReachChartProps {
  analyticsData: AnalyticsData | null
  dateRange?: string // Date range from parent component ('7', '30', or '90')
}

export function ReachChart({ analyticsData, dateRange = '30' }: ReachChartProps) {
  // Use dateRange prop directly (no internal state needed)
  const timePeriod = parseInt(dateRange) as 7 | 30 | 90

  if (!analyticsData) {
    return <div className="h-[500px] sm:h-[550px] animate-pulse bg-gray-200 rounded"></div>
  }

  // Generate chart data from all posts - group by date
  const dataMap = new Map<string, any>()

  // Debug logging
  console.log('[ReachChart] Processing posts:', {
    totalPosts: analyticsData.allPosts.length,
    timePeriod: timePeriod,
    dateRange: dateRange
  })

  analyticsData.allPosts.forEach(post => {
    // Get the posted date and metrics based on platform
    let dateStr = ''
    let reach = 0
    let impressions = 0

    // Handle different data structures from various platforms
    if (post.platform === 'facebook') {
      dateStr = post.created_time || post.timestamp || ''
      // Use views if available (for videos), otherwise use reach/impressions (for page-level data)
      const videoViews = post.views
      if (videoViews && videoViews > 0) {
        // Video post - use views as both reach and impressions
        impressions = videoViews
        reach = post.reach || Math.floor(videoViews * 0.7) // Estimate reach as 70% of views if not available
      } else {
        // Regular post or page-level data
        reach = post.reach || 0
        impressions = post.impressions || reach || 0
      }
    } else if (post.platform === 'instagram') {
      dateStr = post.timestamp || ''
      reach = post.reach || 0
      // Instagram uses plays (views) as impressions for videos/reels
      impressions = post.impressions || post.plays || 0
    } else if (post.platform === 'threads') {
      dateStr = post.timestamp || ''
      reach = post.views || 0
      impressions = post.views || 0 // Threads only has views
    } else if (post.platform === 'pinterest') {
      dateStr = post.created_at || post.timestamp || ''
      reach = post.impressions || 0 // Pinterest uses impressions as reach
      impressions = post.impressions || 0
    } else if (post.platform === 'tiktok') {
      dateStr = post.created_time || post.timestamp || ''
      reach = post.views || 0
      impressions = post.views || 0
    } else if (post.platform === 'bluesky') {
      dateStr = post.createdAt || ''
      // Bluesky doesn't provide real reach/impressions
      reach = 0
      impressions = 0
    } else {
      // Fallback for unknown platforms
      dateStr = post.created_time || post.timestamp || post.createdAt || ''
      reach = post.reach || post.views || 0
      impressions = post.impressions || post.views || 0
    }

    if (!dateStr) return // Skip posts without date

    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return // Skip invalid dates

    // Use UTC date for consistency (avoid timezone mismatches)
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    const day = date.getUTCDate()
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    // Format date label using same UTC date
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const dateLabel = `${monthNames[month]} ${day}`
    
    if (dataMap.has(dateKey)) {
      const existing = dataMap.get(dateKey)
      existing.reach += reach
      existing.impressions += impressions
    } else {
      dataMap.set(dateKey, {
        date: dateLabel,
        reach,
        impressions,
        timestamp: date.getTime()
      })
    }
  })
  
  // Convert map to array and sort
  const allChartData = Array.from(dataMap.values())
    .sort((a, b) => a.timestamp - b.timestamp)

  console.log('[ReachChart] All chart data before filtering:', {
    dataPoints: allChartData.length,
    totalReach: allChartData.reduce((sum, d) => sum + d.reach, 0),
    totalImpressions: allChartData.reduce((sum, d) => sum + d.impressions, 0)
  })

  // Filter data based on time period
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - timePeriod)
  let chartData = allChartData.filter(d => d.timestamp >= cutoffDate.getTime())

  console.log('[ReachChart] Chart data after filtering:', {
    dataPoints: chartData.length,
    cutoffDate: cutoffDate.toISOString(),
    totalReach: chartData.reduce((sum, d) => sum + d.reach, 0),
    totalImpressions: chartData.reduce((sum, d) => sum + d.impressions, 0)
  })

  // Note: No need to remove duplicates - the Map already handles that by dateKey
  // The date label is just for display, multiple posts on same date are already aggregated

  console.log('[ReachChart] Final chart data:', {
    dataPoints: chartData.length,
    totalReach: chartData.reduce((sum, d) => sum + d.reach, 0),
    totalImpressions: chartData.reduce((sum, d) => sum + d.impressions, 0),
    fullData: chartData
  })

  // Calculate statistics
  const totalReach = chartData.reduce((sum, d) => sum + d.reach, 0)
  const totalImpressions = chartData.reduce((sum, d) => sum + d.impressions, 0)
  const avgReach = chartData.length > 0 ? Math.round(totalReach / chartData.length) : 0
  const avgImpressions = chartData.length > 0 ? Math.round(totalImpressions / chartData.length) : 0
  
  // Calculate growth (compare first half vs second half)
  const midPoint = Math.floor(chartData.length / 2)
  const firstHalf = chartData.slice(0, midPoint)
  const secondHalf = chartData.slice(midPoint)
  const firstHalfReach = firstHalf.reduce((sum, d) => sum + d.reach, 0)
  const secondHalfReach = secondHalf.reduce((sum, d) => sum + d.reach, 0)
  const growthPercent = firstHalfReach > 0 
    ? Math.round(((secondHalfReach - firstHalfReach) / firstHalfReach) * 100)
    : 0
  
  // Find peak day
  const peakDay = chartData.reduce((max, d) => d.reach > max.reach ? d : max, chartData[0] || { date: 'N/A', reach: 0 })
  
  if (chartData.length === 0) {
    return (
      <div className="h-[500px] sm:h-[550px] flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📈</div>
          <p className="text-xs sm:text-sm">No reach data available</p>
          <p className="text-[10px] sm:text-xs text-gray-400">Publish posts to see reach trends</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center space-y-4 h-full">
      {/* Chart */}
      <div className="h-[380px] sm:h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              interval={chartData.length <= 8 ? 0 : Math.floor(chartData.length / 6)}
              angle={0}
              textAnchor="middle"
            />
            <YAxis
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`}
              width={40}
              tick={{ fontSize: 10 }}
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
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>Reach</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>Impressions</span>
        </div>
      </div>
      
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Eye className="h-3 w-3" />
            <span>Total Reach</span>
          </div>
          <p className="text-lg font-semibold">
            {totalReach >= 1000 ? `${(totalReach / 1000).toFixed(1)}k` : totalReach.toLocaleString()}
          </p>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Activity className="h-3 w-3" />
            <span>Avg Daily</span>
          </div>
          <p className="text-lg font-semibold">
            {avgReach >= 1000 ? `${(avgReach / 1000).toFixed(1)}k` : avgReach.toLocaleString()}
          </p>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {growthPercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>Growth</span>
          </div>
          <p className={`text-lg font-semibold ${growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {growthPercent >= 0 ? '+' : ''}{growthPercent}%
          </p>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>Peak Day</span>
          </div>
          <p className="text-sm font-medium">
            {peakDay.date}
            <span className="text-xs text-gray-500 ml-1">
              ({peakDay.reach >= 1000 ? `${(peakDay.reach / 1000).toFixed(1)}k` : peakDay.reach})
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}