'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CustomSelect } from '@/components/ui/custom-select'
import { toast } from 'sonner'
import { 
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Shield,
  CreditCard,
  FileText,
  Link as LinkIcon,
  Ban,
  CheckCircle,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react'

interface UserDetails {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string
  subscription_plan: string
  subscription_status: string
  billing_cycle?: string
  role: string
  posts_count: number
  drafts_count: number
  connected_accounts: number
  stripe_customer_id?: string
  trial_ends_at?: string
}

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  
  const [user, setUser] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchUserDetails()
  }, [userId])

  const fetchUserDetails = async () => {
    try {
      let response = await fetch(`/api/admin/users/${userId}`)
      
      // If main endpoint fails, try simple endpoint
      if (!response.ok) {
        console.log('Main endpoint failed, trying simple endpoint...')
        response = await fetch(`/api/admin/users/${userId}/simple`)
      }
      
      if (!response.ok) throw new Error('Failed to fetch user details')
      
      const data = await response.json()
      setUser(data)
    } catch (error) {
      console.error('Error fetching user details:', error)
      toast.error('Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (newRole: string) => {
    if (!user || newRole === user.role) return
    
    try {
      setUpdating(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', role: newRole })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update role')
      }

      toast.success('User role updated successfully')
      // Update the local state immediately for better UX
      setUser(prev => prev ? { ...prev, role: newRole } : null)
      // Then fetch fresh data from server
      fetchUserDetails()
    } catch (error: any) {
      console.error('Error updating role:', error)
      toast.error(error.message || 'Failed to update user role')
    } finally {
      setUpdating(false)
    }
  }

  const handleSuspend = async () => {
    if (!confirm('Are you sure you want to suspend this user?')) return
    
    try {
      setUpdating(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suspend' })
      })

      if (!response.ok) throw new Error('Failed to suspend user')

      toast.success('User suspended successfully')
      fetchUserDetails()
    } catch (error) {
      console.error('Error suspending user:', error)
      toast.error('Failed to suspend user')
    } finally {
      setUpdating(false)
    }
  }

  const handleActivate = async () => {
    try {
      setUpdating(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' })
      })

      if (!response.ok) throw new Error('Failed to activate user')

      toast.success('User activated successfully')
      fetchUserDetails()
    } catch (error) {
      console.error('Error activating user:', error)
      toast.error('Failed to activate user')
    } finally {
      setUpdating(false)
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-700'
      case 'admin': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-100 text-purple-700'
      case 'professional': return 'bg-blue-100 text-blue-700'
      case 'starter': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'trialing': return 'bg-blue-100 text-blue-700'
      case 'canceled': return 'bg-red-100 text-red-700'
      case 'suspended': return 'bg-red-100 text-red-700'
      case 'inactive': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getBillingCycleBadge = (cycle?: string) => {
    if (!cycle || cycle === 'monthly') {
      return { text: 'Monthly', color: 'bg-blue-50 text-blue-600' }
    } else if (cycle === 'annual' || cycle === 'yearly') {
      return { text: 'Annual', color: 'bg-green-50 text-green-600' }
    } else if (cycle === 'lifetime') {
      return { text: 'Lifetime', color: 'bg-purple-50 text-purple-600' }
    }
    return { text: cycle, color: 'bg-gray-50 text-gray-600' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">User not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/admin/users')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/users')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">User Details</h2>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="destructive"
            onClick={handleSuspend}
            disabled={updating}
          >
            <Ban className="h-4 w-4 mr-2" />
            Suspend Account
          </Button>
          <Button
            variant="outline"
            onClick={handleActivate}
            disabled={updating}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Activate Account
          </Button>
        </div>
      </div>

      {/* User Info Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">User ID</p>
              <p className="font-mono text-sm">{user.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Role</p>
              <CustomSelect
                value={user.role}
                onChange={updating ? () => {} : handleRoleChange}
                options={[
                  { value: 'user', label: 'User' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'super_admin', label: 'Super Admin' }
                ]}
              />
              <p className="text-xs text-gray-400 mt-1">
                Only super admins can change roles
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Plan</p>
              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(user.subscription_plan)}`}>
                {user.subscription_plan}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.subscription_status)}`}>
                {user.subscription_status}
              </span>
            </div>
            {user.subscription_plan !== 'free' && user.billing_cycle && (
              <div>
                <p className="text-sm text-gray-500">Billing Cycle</p>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getBillingCycleBadge(user.billing_cycle).color}`}>
                  {getBillingCycleBadge(user.billing_cycle).text}
                </span>
              </div>
            )}
            {user.stripe_customer_id && (
              <div>
                <p className="text-sm text-gray-500">Stripe Customer</p>
                <p className="font-mono text-xs">{user.stripe_customer_id}</p>
              </div>
            )}
            {user.trial_ends_at && (
              <div>
                <p className="text-sm text-gray-500">Trial Ends</p>
                <p className="text-sm">{formatDate(user.trial_ends_at)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-sm">{formatDate(user.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Active</p>
              <p className="text-sm">{formatDate(user.last_sign_in_at)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>
            Content and platform usage for this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{user.posts_count}</p>
                <p className="text-sm text-gray-500">Scheduled Posts</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{user.drafts_count}</p>
                <p className="text-sm text-gray-500">Drafts</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <LinkIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{user.connected_accounts}</p>
                <p className="text-sm text-gray-500">Connected Accounts</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}