'use client'

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Facebook, Instagram, Twitter, Linkedin, Youtube, Camera, AtSign } from 'lucide-react'

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

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'facebook':
      return <Facebook className="h-5 w-5" />
    case 'instagram':
      return <Camera className="h-5 w-5" />
    case 'twitter':
    case 'x':
      return <Twitter className="h-5 w-5" />
    case 'linkedin':
      return <Linkedin className="h-5 w-5" />
    case 'youtube':
      return <Youtube className="h-5 w-5" />
    case 'tiktok':
      return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 12 3v8.5a4.5 4.5 0 1 1-3-4.24v3.1a1.5 1.5 0 1 0 0 2.14V3h3a6.5 6.5 0 0 0 6.5 6.5V6.5A3.5 3.5 0 0 0 19 3z"/>
      </svg>
    case 'bluesky':
      return <span className="text-xl">🦋</span>
    case 'threads':
      return <AtSign className="h-5 w-5" />
    case 'pinterest':
      return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.5 2 2 6.5 2 12c0 4.3 2.7 7.9 6.4 9.3-.1-.8-.2-2 0-2.9.2-.8 1.3-5.4 1.3-5.4s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.7-.3 1.1.6 2 1.7 2 2 0 3.5-2.1 3.5-5.2 0-2.7-2-4.6-4.8-4.6-3.3 0-5.2 2.5-5.2 5 0 1 .4 2.1.9 2.7.1.1.1.2.1.3-.1.4-.3 1.1-.3 1.3-.1.2-.2.3-.4.2-1.4-.7-2.3-2.7-2.3-4.4 0-3.6 2.6-6.9 7.5-6.9 3.9 0 7 2.8 7 6.6 0 3.9-2.5 7.1-5.9 7.1-1.2 0-2.3-.6-2.6-1.3l-.7 2.8c-.3 1-1 2.3-1.5 3.1 1.1.3 2.3.5 3.5.5 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
      </svg>
    default:
      return <Camera className="h-5 w-5" />
  }
}

const platformColors: Record<string, string> = {
  facebook: '#1877f2',
  instagram: '#e4405f',
  twitter: '#1da1f2',
  linkedin: '#0a66c2',
  youtube: '#ff0000',
  tiktok: '#000000',
  bluesky: '#0085ff',
  threads: '#000000',
  pinterest: '#e60023'
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
    platformKey: platform,
    posts: stats.posts,
    engagement: stats.engagement,
    reach: stats.reach,
    color: platformColors[platform] || '#8884d8'
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
    <div className="h-[220px] sm:h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
          barGap={8}
        >
          <defs>
            {data.map((entry, index) => (
              <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={entry.color} stopOpacity={1}/>
                <stop offset="100%" stopColor={entry.color} stopOpacity={0.7}/>
              </linearGradient>
            ))}
          </defs>
          <XAxis
            dataKey="platform"
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
            tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={70}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
            tickFormatter={(value) => {
              if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
              return value.toString()
            }}
            width={45}
            tick={{ fill: '#4b5563', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="rounded-xl border-2 bg-white p-4 shadow-2xl">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-md"
                        style={{ backgroundColor: data.color }}
                      >
                        {getPlatformIcon(data.platformKey)}
                      </div>
                      <span className="font-semibold text-base text-gray-900">{data.platform}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Posts:</span>
                        <span className="font-semibold text-sm text-gray-900">{data.posts}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Engagement:</span>
                        <span className="font-semibold text-sm text-gray-900">{data.engagement.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Reach:</span>
                        <span className="font-semibold text-sm text-gray-900">{data.reach.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar
            dataKey="engagement"
            radius={[8, 8, 0, 0]}
            maxBarSize={60}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#colorGradient-${index})`}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}