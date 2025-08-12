'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/custom-select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  FileText,
  Search,
  Filter,
  User,
  Shield,
  Activity,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react'

interface AuditLog {
  id: string
  admin_id: string
  admin_email?: string
  action: string
  target_user_id?: string
  target_resource?: string
  details?: any
  created_at: string
}

interface AuditStats {
  todayActions: number
  activeAdmins: number
  criticalActions: number
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats>({ todayActions: 0, activeAdmins: 0, criticalActions: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    fetchAuditLogs()
    fetchAuditStats()
  }, [page, actionFilter, dateFilter])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(search && { search }),
        ...(actionFilter !== 'all' && { action: actionFilter }),
        ...(dateFilter !== 'all' && { date: dateFilter })
      })

      const response = await fetch(`/api/admin/audit?${params}`)
      if (!response.ok) throw new Error('Failed to fetch audit logs')
      
      const data = await response.json()
      setLogs(data.logs)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchAuditStats = async () => {
    try {
      const response = await fetch('/api/admin/audit?stats=true')
      if (!response.ok) throw new Error('Failed to fetch audit stats')
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching audit stats:', error)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchAuditLogs()
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

  const getActionBadgeColor = (action: string) => {
    if (action.includes('view')) return 'bg-blue-100 text-blue-700'
    if (action.includes('update') || action.includes('activate')) return 'bg-green-100 text-green-700'
    if (action.includes('suspend') || action.includes('delete')) return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  const getActionIcon = (action: string) => {
    if (action.includes('view')) return <Activity className="h-4 w-4" />
    if (action.includes('role')) return <Shield className="h-4 w-4" />
    if (action.includes('user')) return <User className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const formatActionName = (action: string) => {
    return action.split('_').join(' ')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground">
          Track all administrative actions and changes
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by admin email or action..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <CustomSelect
              value={actionFilter}
              onChange={setActionFilter}
              options={[
                { value: 'all', label: 'All Actions' },
                { value: 'view_users', label: 'View Users' },
                { value: 'view_user_details', label: 'View Details' },
                { value: 'update_user_role', label: 'Update Role' },
                { value: 'suspend_user', label: 'Suspend User' },
                { value: 'activate_user', label: 'Activate User' }
              ]}
            />
            <CustomSelect
              value={dateFilter}
              onChange={setDateFilter}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'Last 7 Days' },
                { value: 'month', label: 'This Month' }
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileText className="h-12 w-12 mb-4" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                          <span className="ml-3 text-sm font-medium text-gray-900">
                            {log.admin_email || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                          {getActionIcon(log.action)}
                          <span className="ml-1">{formatActionName(log.action)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.target_user_id || log.target_resource || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.details ? (
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {JSON.stringify(log.details).slice(0, 50)}...
                          </code>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <div className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Actions Today
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayActions}</div>
            <p className="text-xs text-muted-foreground">
              Administrative actions logged
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Admins
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAdmins}</div>
            <p className="text-xs text-muted-foreground">
              Admins active today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Actions
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.criticalActions}</div>
            <p className="text-xs text-muted-foreground">
              Suspensions or role changes
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}