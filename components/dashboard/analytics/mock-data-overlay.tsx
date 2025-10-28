'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BarChart3, Settings, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export function MockDataOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Centered overlay card */}
      <Card className="relative z-10 max-w-lg mx-4 border-2 shadow-2xl bg-white">
        <div className="p-8 text-center space-y-6">
          {/* Icon with gradient background */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-xl opacity-50" />
              <div className="relative p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full">
                <BarChart3 className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Connect Your Accounts to See Real Data
            </h2>
            <p className="text-gray-600 leading-relaxed">
              This is a preview of what your analytics will look like once you connect your social media accounts.
              Connect now to start tracking your real performance metrics.
            </p>
          </div>

          {/* Features list */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 space-y-2 text-left">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Track Performance Across All Platforms</p>
                <p className="text-xs text-gray-600">See engagement, reach, and growth metrics in one dashboard</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Beautiful Visual Reports</p>
                <p className="text-xs text-gray-600">Charts, graphs, and insights updated in real-time</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Platform-Specific Insights</p>
                <p className="text-xs text-gray-600">Deep dive into each platform's unique metrics</p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 pt-2">
            <Link href="/dashboard/settings" className="block">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-lg"
              >
                Connect Your First Account
              </Button>
            </Link>
            <p className="text-xs text-gray-500">
              Free to connect • Supports all major platforms
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
