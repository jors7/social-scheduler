'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InstagramInsights } from './instagram-insights'
import { ThreadsInsights } from './threads-insights'
import { FacebookInsights } from './facebook-insights'
import { LinkedInInsights } from './linkedin-insights'
import { TwitterInsights } from './twitter-insights'
import { BlueskyInsights } from './bluesky-insights'
import { AllPlatformsOverview } from './all-platforms-overview'
import { 
  LayoutGrid,
  Camera, 
  AtSign, 
  Facebook, 
  Linkedin, 
  Twitter,
  Cloud,
  Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlatformInsightsTabsProps {
  className?: string
  connectedPlatforms?: string[]
  days?: number // Date range in days to pass to AllPlatformsOverview
}

type TabType = 'all' | 'instagram' | 'threads' | 'facebook' | 'linkedin' | 'twitter' | 'bluesky'

interface TabConfig {
  id: TabType
  label: string
  icon: React.ReactNode
  color: string
  available: boolean
}

export function PlatformInsightsTabs({ className, connectedPlatforms = [], days = 30 }: PlatformInsightsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch connected platforms
  useEffect(() => {
    const fetchConnectedPlatforms = async () => {
      try {
        const response = await fetch('/api/social-accounts')
        if (response.ok) {
          const accounts = await response.json()
          const platforms = Array.from(new Set(accounts
            .filter((acc: any) => acc.is_active)
            .map((acc: any) => acc.platform.toLowerCase())
          )) as string[]
          setAvailablePlatforms(platforms)
        }
      } catch (error) {
        console.error('Error fetching connected platforms:', error)
      } finally {
        setLoading(false)
      }
    }

    if (connectedPlatforms.length === 0) {
      fetchConnectedPlatforms()
    } else {
      setAvailablePlatforms(connectedPlatforms)
      setLoading(false)
    }
  }, [connectedPlatforms.length])

  const tabs: TabConfig[] = [
    {
      id: 'all',
      label: 'Overview',
      icon: <LayoutGrid className="h-4 w-4" />,
      color: 'bg-gradient-to-r from-purple-500 to-blue-500',
      available: true
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: <Camera className="h-4 w-4" />,
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      available: availablePlatforms.includes('instagram')
    },
    {
      id: 'threads',
      label: 'Threads',
      icon: <AtSign className="h-4 w-4" />,
      color: 'bg-black',
      available: availablePlatforms.includes('threads')
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: <Facebook className="h-4 w-4" />,
      color: 'bg-blue-600',
      available: availablePlatforms.includes('facebook')
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      icon: <Linkedin className="h-4 w-4" />,
      color: 'bg-blue-700',
      available: availablePlatforms.includes('linkedin')
    },
    {
      id: 'twitter',
      label: 'X',
      icon: <Twitter className="h-4 w-4" />,
      color: 'bg-black',
      available: availablePlatforms.includes('twitter')
    },
    {
      id: 'bluesky',
      label: 'Bluesky',
      icon: <Cloud className="h-4 w-4" />,
      color: 'bg-sky-500',
      available: availablePlatforms.includes('bluesky')
    }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'all':
        return <AllPlatformsOverview key="all-platforms" connectedPlatforms={availablePlatforms} days={days} />
      case 'instagram':
        return availablePlatforms.includes('instagram') ? <InstagramInsights key="instagram-insights" /> : null
      case 'threads':
        return availablePlatforms.includes('threads') ? <ThreadsInsights key="threads-insights" /> : null
      case 'facebook':
        return availablePlatforms.includes('facebook') ? <FacebookInsights key="facebook-insights" /> : null
      case 'linkedin':
        return availablePlatforms.includes('linkedin') ? <LinkedInInsights key="linkedin-insights" /> : null
      case 'twitter':
        return availablePlatforms.includes('twitter') ? <TwitterInsights key="twitter-insights" /> : null
      case 'bluesky':
        return availablePlatforms.includes('bluesky') ? <BlueskyInsights key="bluesky-insights" /> : null
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-4">Loading platform insights...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tab Navigation */}
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Platform Insights</CardTitle>
              <CardDescription className="text-sm mt-1">
                Detailed analytics for your connected social media platforms
              </CardDescription>
            </div>
            {availablePlatforms.length > 0 && (
              <Badge variant="secondary" className="ml-4">
                {availablePlatforms.length} platform{availablePlatforms.length !== 1 ? 's' : ''} connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2 border-b pb-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              const isAvailable = tab.available || tab.id === 'all'
              
              return (
                <button
                  key={tab.id}
                  onClick={() => isAvailable && setActiveTab(tab.id)}
                  disabled={!isAvailable}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200",
                    isActive && isAvailable && "text-white shadow-lg transform scale-105",
                    !isActive && isAvailable && "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                    !isAvailable && "text-gray-400 cursor-not-allowed opacity-50",
                    isActive && isAvailable && tab.color
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {!isAvailable && tab.id !== 'all' && (
                    <Lock className="h-3 w-3 ml-1" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>

      {/* No Platforms Connected Message */}
      {availablePlatforms.length === 0 && activeTab !== 'all' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Lock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">No social media platforms connected</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/dashboard/settings'}
              >
                Connect Platforms
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}