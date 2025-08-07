'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
// import { subscriptionService } from '@/lib/subscription/service'
// Note: This component needs to use a client-side API to get usage data
import { formatUsageDisplay, getUsagePercentage, isNearLimit } from '@/lib/subscription/usage'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Infinity as InfinityIcon } from 'lucide-react'

interface UsageTrackerProps {
  resource: 'posts' | 'ai_suggestions' | 'connected_accounts'
  showLabel?: boolean
  showProgress?: boolean
  className?: string
  compact?: boolean
}

export function UsageTracker({ 
  resource, 
  showLabel = true, 
  showProgress = true,
  className,
  compact = false
}: UsageTrackerProps) {
  const [usage, setUsage] = useState({ current: 0, limit: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsage()
  }, [resource])

  const loadUsage = async () => {
    try {
      // TODO: Replace with client-side API call
      // const summary = await subscriptionService.getUsageSummary()
      const summary = {
        posts_used: 0,
        posts_limit: 100,
        ai_suggestions_used: 0,
        ai_suggestions_limit: 20,
        connected_accounts_used: 0,
        connected_accounts_limit: 5
      }
      
      switch (resource) {
        case 'posts':
          setUsage({ current: summary.posts_used, limit: summary.posts_limit })
          break
        case 'ai_suggestions':
          setUsage({ current: summary.ai_suggestions_used, limit: summary.ai_suggestions_limit })
          break
        case 'connected_accounts':
          setUsage({ current: summary.connected_accounts_used, limit: summary.connected_accounts_limit })
          break
      }
    } catch (error) {
      console.error('Failed to load usage:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className={cn("animate-pulse h-4 bg-muted rounded", className)} />
  }

  const percentage = getUsagePercentage(usage.current, usage.limit)
  const nearLimit = isNearLimit(usage.current, usage.limit)
  const atLimit = usage.current >= usage.limit && usage.limit !== -1

  const getResourceLabel = () => {
    switch (resource) {
      case 'posts':
        return 'Posts this month'
      case 'ai_suggestions':
        return 'AI suggestions'
      case 'connected_accounts':
        return 'Connected accounts'
    }
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        {atLimit ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : nearLimit ? (
          <AlertCircle className="h-4 w-4 text-warning" />
        ) : (
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        )}
        <span className={cn(
          atLimit && "text-destructive",
          nearLimit && !atLimit && "text-warning"
        )}>
          {formatUsageDisplay(usage.current, usage.limit)}
        </span>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{getResourceLabel()}</span>
          <div className="flex items-center gap-1">
            <span className={cn(
              "font-medium",
              atLimit && "text-destructive",
              nearLimit && !atLimit && "text-warning"
            )}>
              {formatUsageDisplay(usage.current, usage.limit)}
            </span>
            {usage.limit === -1 && (
              <InfinityIcon className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
      )}
      
      {showProgress && usage.limit !== -1 && (
        <Progress 
          value={percentage} 
          className={cn(
            "h-2",
            atLimit && "[&>div]:bg-destructive",
            nearLimit && !atLimit && "[&>div]:bg-warning"
          )}
        />
      )}
      
      {atLimit && (
        <p className="text-xs text-destructive">
          Limit reached. Upgrade to continue.
        </p>
      )}
    </div>
  )
}

interface UsageSummaryProps {
  className?: string
  showProgress?: boolean
}

export function UsageSummary({ className, showProgress = true }: UsageSummaryProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <UsageTracker resource="posts" showProgress={showProgress} />
      <UsageTracker resource="ai_suggestions" showProgress={showProgress} />
      <UsageTracker resource="connected_accounts" showProgress={showProgress} />
    </div>
  )
}