'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

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

interface PlatformBreakdownProps {
  analyticsData: AnalyticsData | null
}

const platformIcons: Record<string, string> = {
  facebook: '📘',
  instagram: '📷', 
  twitter: '🐦',
  linkedin: '💼',
  youtube: '📹',
  tiktok: '🎵',
  bluesky: '🦋',
  threads: '🧵',
  pinterest: '📌'
}

export function PlatformBreakdown({ analyticsData }: PlatformBreakdownProps) {
  if (!analyticsData) {
    return (
      <div className="space-y-4">
        <div className="h-[200px] animate-pulse bg-gray-200 rounded"></div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  console.log('[PlatformBreakdown] analyticsData:', analyticsData)
  console.log('[PlatformBreakdown] platformStats:', analyticsData.platformStats)

  const data = Object.entries(analyticsData.platformStats).map(([platform, stats]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    posts: stats.posts,
    engagement: stats.engagement,
    reach: stats.reach,
    icon: platformIcons[platform] || '📱'
  })).sort((a, b) => b.engagement - a.engagement)

  console.log('[PlatformBreakdown] data:', data)
  
  if (data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-[180px] sm:h-[200px] flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📊</div>
            <p className="text-xs sm:text-sm">No platform data available</p>
            <p className="text-[10px] sm:text-xs text-gray-400">Publish some posts to see platform performance</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Chart Container */}
      <div className="h-[180px] sm:h-[200px] w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 5, left: 0, bottom: 5 }}>
            <XAxis 
              dataKey="platform" 
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
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
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{data.icon}</span>
                        <span className="font-medium">{label}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-sm">
                        <div>Posts: {data.posts}</div>
                        <div>Engagement: {data.engagement.toLocaleString()}</div>
                        <div>Reach: {data.reach.toLocaleString()}</div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar 
              dataKey="engagement" 
              fill="#8884d8" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Platform Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
        {data.map((platform) => (
          <div key={platform.platform} className="flex items-center space-x-1 sm:space-x-2">
            <span className="text-base sm:text-lg">{platform.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs sm:text-sm truncate">{platform.platform}</div>
              <div className="text-muted-foreground text-[10px] sm:text-xs">
                {platform.posts} post{platform.posts !== 1 ? 's' : ''} • {platform.engagement.toLocaleString()} eng
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}