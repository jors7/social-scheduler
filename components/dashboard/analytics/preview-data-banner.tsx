'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BarChart3, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export function PreviewDataBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <Card className="relative overflow-hidden border-2 border-purple-200 shadow-lg">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Preview Mode - Sample Data
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-purple-100 mb-3 sm:mb-4">
                  This is a preview of what your analytics dashboard will look like. Connect your social media accounts to see your real performance data and insights.
                </p>

                {/* CTA Button - Full width on mobile, auto on desktop */}
                <Link href="/dashboard/settings" className="inline-block w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white text-purple-600 hover:bg-purple-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Connect Your First Account
                  </Button>
                </Link>
              </div>

              {/* Dismiss button - only on desktop */}
              <button
                onClick={() => setDismissed(true)}
                className="hidden sm:block flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="h-5 w-5 text-white/80 hover:text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Benefits Pills */}
        <div className="flex flex-wrap gap-2 mt-4 sm:ml-[68px]">
          <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs sm:text-sm text-white font-medium">
            ✓ Free to connect
          </div>
          <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs sm:text-sm text-white font-medium">
            ✓ All major platforms
          </div>
          <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs sm:text-sm text-white font-medium">
            ✓ Real-time updates
          </div>
        </div>
      </div>
    </Card>
  )
}
