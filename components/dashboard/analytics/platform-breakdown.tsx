'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getPlatformData } from '@/lib/mock-analytics'

export function PlatformBreakdown() {
  const data = getPlatformData()

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
                {platform.posts} posts • {platform.engagement.toLocaleString()} engagement
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}