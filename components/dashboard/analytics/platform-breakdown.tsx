'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

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

  const data = Object.entries(analyticsData.platformStats).map(([platform, stats]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    posts: stats.posts,
    engagement: stats.engagement,
    reach: stats.reach,
    icon: platformIcons[platform] || '📱'
  })).sort((a, b) => b.engagement - a.engagement)
  
  if (data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-[200px] flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-sm">No platform data available</p>
            <p className="text-xs text-gray-400">Publish some posts to see platform performance</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chart Container */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="platform" 
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
      <div className="grid grid-cols-2 gap-2 text-sm">
        {data.map((platform) => (
          <div key={platform.platform} className="flex items-center space-x-2">
            <span className="text-lg">{platform.icon}</span>
            <div className="flex-1">
              <div className="font-medium">{platform.platform}</div>
              <div className="text-muted-foreground text-xs">
                {platform.posts} post{platform.posts !== 1 ? 's' : ''} • {platform.engagement.toLocaleString()} engagement
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}