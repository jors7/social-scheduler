'use client'

import { CheckCircle2 } from 'lucide-react'

interface StatusIndicatorProps {
  status?: 'operational' | 'degraded' | 'outage'
  lastUpdated?: string
}

export function StatusIndicator({
  status = 'operational',
  lastUpdated
}: StatusIndicatorProps) {
  const statusConfig = {
    operational: {
      label: 'All Systems Operational',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: CheckCircle2,
    },
    degraded: {
      label: 'Some Systems Degraded',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: CheckCircle2,
    },
    outage: {
      label: 'System Outage',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: CheckCircle2,
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  // Generate last updated time
  const getLastUpdated = () => {
    if (lastUpdated) return lastUpdated
    const now = new Date()
    return `Updated ${now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })} UTC`
  }

  return (
    <div className={`mx-4 p-3 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${config.color}`} />
        <div className="flex-1">
          <p className={`font-medium ${config.color}`}>{config.label}</p>
          <p className="text-xs text-gray-500">{getLastUpdated()}</p>
        </div>
      </div>
    </div>
  )
}
