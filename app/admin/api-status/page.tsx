'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  ExternalLink,
  Info,
  Trash2
} from 'lucide-react'

interface PlatformHealth {
  status: 'healthy' | 'warning' | 'error'
  lastAlert?: string
  alertCount: number
}

interface Deprecation {
  id: string
  metric: string
  replacedBy: string
  deprecationDate: string
  status: 'upcoming' | 'deprecated' | 'removed'
  notes?: string
  daysUntil?: number
}

interface Platform {
  platform: string
  currentVersion: string
  baseUrl: string
  expectedMetrics: string[]
  notes?: string
  health: PlatformHealth
  deprecations: Deprecation[]
}

interface Alert {
  id: string
  issue_id: string
  platform: string
  severity: 'warning' | 'error' | 'critical'
  issue_type: string
  message: string
  details: Record<string, any>
  recommended_action: string
  alerted_at: string
  expires_at: string
}

interface APIStatusData {
  platforms: Platform[]
  recentAlerts: Alert[]
  upcomingDeprecations: (Deprecation & { platform: string; daysUntil: number })[]
  summary: {
    totalPlatforms: number
    healthyPlatforms: number
    warningPlatforms: number
    errorPlatforms: number
    totalAlerts: number
    activeDeprecations: number
  }
}

export default function AdminAPIStatusPage() {
  const [data, setData] = useState<APIStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleaning, setCleaning] = useState(false)

  useEffect(() => {
    fetchAPIStatus()
  }, [])

  const fetchAPIStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/api-status')
      if (!response.ok) throw new Error('Failed to fetch API status')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching API status:', error)
      toast.error('Failed to load API status')
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    try {
      setCleaning(true)
      const response = await fetch('/api/admin/api-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' }),
      })

      if (!response.ok) throw new Error('Failed to cleanup alerts')

      const result = await response.json()
      toast.success(result.message)
      fetchAPIStatus()
    } catch (error) {
      console.error('Error cleaning up alerts:', error)
      toast.error('Failed to cleanup alerts')
    } finally {
      setCleaning(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getHealthIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getHealthBadge = (status: 'healthy' | 'warning' | 'error') => {
    const styles = {
      healthy: 'bg-green-100 text-green-700 border-green-200',
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      error: 'bg-red-100 text-red-700 border-red-200',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  const getSeverityBadge = (severity: 'warning' | 'error' | 'critical') => {
    const styles = {
      warning: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
      critical: 'bg-red-200 text-red-800',
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[severity]}`}>
        {severity.toUpperCase()}
      </span>
    )
  }

  const getPlatformName = (platform: string) => {
    const names: Record<string, string> = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      threads: 'Threads',
      pinterest: 'Pinterest',
      youtube: 'YouTube',
      tiktok: 'TikTok',
      bluesky: 'Bluesky',
    }
    return names[platform] || platform
  }

  const formatIssueType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load API status</p>
        <Button onClick={fetchAPIStatus} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">API Status</h2>
          <p className="text-muted-foreground">
            Monitor social platform API health and deprecations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleCleanup} disabled={cleaning}>
            <Trash2 className="h-4 w-4 mr-2" />
            {cleaning ? 'Cleaning...' : 'Cleanup Expired'}
          </Button>
          <Button onClick={fetchAPIStatus}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Platforms</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalPlatforms}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.healthyPlatforms} healthy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.warningPlatforms}</div>
            <p className="text-xs text-muted-foreground">
              Platforms with warnings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.errorPlatforms}</div>
            <p className="text-xs text-muted-foreground">
              Platforms with errors
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deprecations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.activeDeprecations}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Platform Health</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.platforms.map((platform) => (
            <Card key={platform.platform}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{getPlatformName(platform.platform)}</CardTitle>
                  {getHealthIcon(platform.health.status)}
                </div>
                <CardDescription>
                  Version: {platform.currentVersion}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    {getHealthBadge(platform.health.status)}
                  </div>

                  {platform.health.alertCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Alerts (7d)</span>
                      <span className="text-sm font-medium">{platform.health.alertCount}</span>
                    </div>
                  )}

                  {platform.health.lastAlert && (
                    <div className="text-xs text-gray-400">
                      Last alert: {formatDate(platform.health.lastAlert)}
                    </div>
                  )}

                  {platform.deprecations.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-gray-500 mb-1">Deprecations:</p>
                      {platform.deprecations.map((dep) => (
                        <div key={dep.id} className="text-xs text-gray-600 flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span>
                            <code className="bg-gray-100 px-1 rounded">{dep.metric}</code> → <code className="bg-gray-100 px-1 rounded">{dep.replacedBy}</code>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {platform.notes && (
                    <div className="flex items-start gap-1 pt-2 border-t">
                      <Info className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-500">{platform.notes}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Upcoming Deprecations */}
      {data.upcomingDeprecations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming & Recent Deprecations</CardTitle>
            <CardDescription>
              API changes that require attention within 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.upcomingDeprecations.map((dep) => (
                <div key={`${dep.platform}-${dep.id}`} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getPlatformName(dep.platform)}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        dep.status === 'upcoming' ? 'bg-yellow-100 text-yellow-700' :
                        dep.status === 'deprecated' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {dep.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm">
                      <code className="bg-gray-100 px-1 rounded">{dep.metric}</code>
                      {' → '}
                      <code className="bg-green-50 text-green-700 px-1 rounded">{dep.replacedBy}</code>
                    </p>
                    {dep.notes && (
                      <p className="text-xs text-gray-500">{dep.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {dep.daysUntil < 0
                        ? `${Math.abs(dep.daysUntil)} days ago`
                        : dep.daysUntil === 0
                        ? 'Today'
                        : `${dep.daysUntil} days`
                      }
                    </p>
                    <p className="text-xs text-gray-500">{dep.deprecationDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>
            API issues detected in the last 7 days ({data.summary.totalAlerts} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No alerts in the last 7 days</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentAlerts.map((alert) => (
                <div key={alert.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(alert.severity)}
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {getPlatformName(alert.platform)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatIssueType(alert.issue_type)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(alert.alerted_at)}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-2">{alert.message}</p>
                  {alert.details && Object.keys(alert.details).length > 0 && (
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto mb-2">
                      {JSON.stringify(alert.details, null, 2)}
                    </pre>
                  )}
                  {alert.recommended_action && (
                    <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{alert.recommended_action}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
