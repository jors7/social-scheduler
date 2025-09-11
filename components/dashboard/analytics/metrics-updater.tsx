'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  RefreshCw, 
  Camera, 
  AtSign, 
  Facebook, 
  Linkedin, 
  Twitter,
  Check,
  X,
  Loader2,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MetricsUpdaterProps {
  onUpdate?: () => void
  className?: string
}

interface PlatformUpdateStatus {
  platform: string
  enabled: boolean
  updating: boolean
  success?: boolean
  message?: string
}

export function MetricsUpdater({ onUpdate, className }: MetricsUpdaterProps) {
  const [updating, setUpdating] = useState(false)
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set())
  const [updateStatus, setUpdateStatus] = useState<Map<string, PlatformUpdateStatus>>(new Map())
  const [showProgress, setShowProgress] = useState(false)

  useEffect(() => {
    fetchAvailablePlatforms()
  }, [])

  const fetchAvailablePlatforms = async () => {
    try {
      const response = await fetch('/api/social-accounts')
      if (response.ok) {
        const accounts = await response.json()
        const platformSet = new Set<string>(accounts
          .filter((acc: any) => acc.is_active)
          .map((acc: any) => acc.platform.toLowerCase())
        )
        const platforms = Array.from(platformSet)
        setAvailablePlatforms(platforms)
        // By default, select all available platforms
        setSelectedPlatforms(new Set(platforms))
        
        // Initialize status for each platform
        const initialStatus = new Map<string, PlatformUpdateStatus>()
        platforms.forEach(platform => {
          initialStatus.set(platform, {
            platform,
            enabled: true,
            updating: false
          })
        })
        setUpdateStatus(initialStatus)
      }
    } catch (error) {
      console.error('Error fetching platforms:', error)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Camera className="h-4 w-4" />
      case 'threads':
        return <AtSign className="h-4 w-4" />
      case 'facebook':
        return <Facebook className="h-4 w-4" />
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />
      case 'twitter':
      case 'x':
        return <Twitter className="h-4 w-4" />
      default:
        return null
    }
  }

  const togglePlatform = (platform: string) => {
    const newSelected = new Set(selectedPlatforms)
    if (newSelected.has(platform)) {
      newSelected.delete(platform)
    } else {
      newSelected.add(platform)
    }
    setSelectedPlatforms(newSelected)
    
    // Update status
    const newStatus = new Map(updateStatus)
    const status = newStatus.get(platform)
    if (status) {
      status.enabled = newSelected.has(platform)
      newStatus.set(platform, status)
    }
    setUpdateStatus(newStatus)
  }

  const updateMetrics = async () => {
    if (selectedPlatforms.size === 0) {
      toast.error('Please select at least one platform to update')
      return
    }

    setUpdating(true)
    setShowProgress(true)
    
    // Reset status
    const newStatus = new Map<string, PlatformUpdateStatus>()
    selectedPlatforms.forEach(platform => {
      newStatus.set(platform, {
        platform,
        enabled: true,
        updating: true
      })
    })
    setUpdateStatus(newStatus)

    // Update each selected platform
    for (const platform of Array.from(selectedPlatforms)) {
      try {
        let endpoint = ''
        switch (platform) {
          case 'instagram':
            endpoint = '/api/instagram/update-metrics'
            break
          case 'threads':
            endpoint = '/api/threads/update-metrics'
            break
          case 'linkedin':
            endpoint = '/api/linkedin/update-metrics'
            break
          case 'twitter':
          case 'x':
            endpoint = '/api/twitter/update-metrics'
            break
          // Add more platforms as they become available
          default:
            continue
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        const data = await response.json()
        
        // Update status for this platform
        const platformStatus = newStatus.get(platform)
        if (platformStatus) {
          platformStatus.updating = false
          platformStatus.success = response.ok
          
          if (response.ok) {
            platformStatus.message = data.updatedCount > 0 
              ? `Updated ${data.updatedCount} posts`
              : 'No posts to update'
          } else {
            platformStatus.message = data.error || 'Failed to update'
          }
          
          newStatus.set(platform, platformStatus)
          setUpdateStatus(new Map(newStatus))
        }

        if (response.ok && data.updatedCount > 0) {
          toast.success(`${platform}: Updated ${data.updatedCount} posts`)
        }
      } catch (error) {
        console.error(`Error updating ${platform} metrics:`, error)
        
        const platformStatus = newStatus.get(platform)
        if (platformStatus) {
          platformStatus.updating = false
          platformStatus.success = false
          platformStatus.message = 'Network error'
          newStatus.set(platform, platformStatus)
          setUpdateStatus(new Map(newStatus))
        }
      }
    }

    setUpdating(false)
    
    // Call onUpdate callback if provided
    if (onUpdate) {
      onUpdate()
    }

    // Hide progress after 3 seconds
    setTimeout(() => {
      setShowProgress(false)
    }, 3000)
  }

  const updateAll = async () => {
    // Select all platforms and update
    setSelectedPlatforms(new Set(availablePlatforms))
    const newStatus = new Map<string, PlatformUpdateStatus>()
    availablePlatforms.forEach(platform => {
      newStatus.set(platform, {
        platform,
        enabled: true,
        updating: false
      })
    })
    setUpdateStatus(newStatus)
    
    // Small delay to show selection change
    setTimeout(() => {
      updateMetrics()
    }, 100)
  }

  if (availablePlatforms.length === 0) {
    return null
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={updating}
              className="gap-2"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Update Metrics
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Select Platforms</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availablePlatforms.map(platform => (
              <DropdownMenuCheckboxItem
                key={platform}
                checked={selectedPlatforms.has(platform)}
                onCheckedChange={() => togglePlatform(platform)}
                disabled={updating}
              >
                <div className="flex items-center gap-2">
                  {getPlatformIcon(platform)}
                  <span className="capitalize">{platform}</span>
                </div>
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => updateMetrics()}
              disabled={updating || selectedPlatforms.size === 0}
              className="font-medium"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={updateAll}
          disabled={updating}
          className="text-xs"
        >
          Update All
        </Button>
      </div>

      {/* Progress Indicator */}
      {showProgress && (
        <Card className="absolute top-12 right-0 z-50 shadow-lg border-2 min-w-[250px]">
          <CardContent className="p-3">
            <div className="space-y-2">
              {Array.from(updateStatus.values()).map(status => (
                <div key={status.platform} className="flex items-center gap-2">
                  {getPlatformIcon(status.platform)}
                  <span className="capitalize text-sm flex-1">{status.platform}</span>
                  {status.updating ? (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  ) : status.success === true ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : status.success === false ? (
                    <X className="h-3 w-3 text-red-500" />
                  ) : null}
                  {status.message && !status.updating && (
                    <span className="text-xs text-gray-500">{status.message}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}