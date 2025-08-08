'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { User, Mail, Calendar, CreditCard, Shield, Loader2 } from 'lucide-react'
import { getClientSubscription } from '@/lib/subscription/client'
import { format } from 'date-fns'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: ''
  })
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      // Get user data
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      
      setUser(user)
      setFormData({
        full_name: user?.user_metadata?.full_name || '',
        email: user?.email || ''
      })

      // Get subscription data
      const subData = await getClientSubscription()
      setSubscription(subData)
    } catch (error) {
      console.error('Error loading user data:', error)
      toast.error('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    setUpdating(true)
    try {
      // Update user metadata
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: formData.full_name }
      })

      if (error) throw error

      // Force a session refresh to get updated user data
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
      if (sessionError) throw sessionError

      // Update local state with new data
      if (data.user) {
        setUser(data.user)
        setFormData({
          full_name: data.user.user_metadata?.full_name || '',
          email: data.user.email || ''
        })
      }

      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setUpdating(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user?.email || ''
      })

      if (error) throw error
      toast.success('Verification email sent!')
    } catch (error) {
      console.error('Error sending verification:', error)
      toast.error('Failed to send verification email')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const getPlanBadgeColor = (planId: string) => {
    switch (planId) {
      case 'enterprise': return 'bg-purple-100 text-purple-700'
      case 'professional': return 'bg-blue-100 text-blue-700'
      case 'starter': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'trialing': return 'bg-yellow-100 text-yellow-700'
      case 'canceled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account settings and subscription</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  value={formData.email}
                  disabled
                  className="flex-1"
                />
                {user?.email_confirmed_at ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Verified
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                  >
                    Verify
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label>Member Since</Label>
              <p className="text-sm text-gray-600">
                {user?.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : 'N/A'}
              </p>
            </div>
            <Button 
              onClick={handleUpdateProfile}
              disabled={updating}
              className="w-full"
            >
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Status
            </CardTitle>
            <CardDescription>Your current plan and billing details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Plan</span>
              <Badge className={getPlanBadgeColor(subscription?.planId || 'free')}>
                {subscription?.planId ? subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1) : 'Free'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge className={getStatusBadgeColor(subscription?.status || 'active')}>
                {subscription?.status || 'Active'}
              </Badge>
            </div>
            {subscription?.isTrialing && subscription?.trialEndsAt && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Trial Ends</span>
                  <span className="text-sm text-gray-600">
                    {format(new Date(subscription.trialEndsAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">First Payment</span>
                  <span className="text-sm text-gray-600">
                    {format(new Date(subscription.trialEndsAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </>
            )}
            {subscription?.hasSubscription && !subscription?.isTrialing && subscription?.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Billing Period Ends</span>
                <span className="text-sm text-gray-600">
                  {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            <div className="pt-4 border-t">
              {subscription?.hasSubscription ? (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = '/dashboard/billing'}
                >
                  Manage Subscription
                </Button>
              ) : (
                <Button 
                  className="w-full"
                  onClick={() => window.location.href = '/#pricing'}
                >
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-gray-600">Last changed: Never</p>
            </div>
            <Button variant="outline">Change Password</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-gray-600">Add an extra layer of security</p>
            </div>
            <Button variant="outline" disabled>Coming Soon</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}