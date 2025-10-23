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
import { cn } from '@/lib/utils'

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

  const handleChangePassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        user?.email || '',
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (error) throw error
      toast.success('Password reset email sent! Check your inbox to set a new password.')
    } catch (error) {
      console.error('Error sending password reset:', error)
      toast.error('Failed to send password reset email')
    }
  }

  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent className="text-center py-16 bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-fit mx-auto mb-6">
            <Loader2 className="h-12 w-12 text-white animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading profile...</h3>
          <p className="text-gray-600">Please wait while we load your information</p>
        </CardContent>
      </Card>
    )
  }

  const getPlanBadgeColor = (planId: string) => {
    switch (planId) {
      case 'enterprise': return 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700'
      case 'professional': return 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700'
      case 'starter': return 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
      default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
      case 'trialing': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'
      case 'canceled': return 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700'
      default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300'
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            Profile
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Manage your account settings and subscription</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Profile Information */}
        <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden hover:-translate-y-0.5">
          <CardHeader className="border-b pb-6">
            <CardTitle>
              Profile Information
            </CardTitle>
            <CardDescription className="mt-2">Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
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
                  <Badge variant="secondary" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg px-4 py-2 rounded-xl font-semibold min-w-[80px] justify-center hover:from-emerald-600 hover:to-green-700">
                    Verified
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
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
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
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
        <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden hover:-translate-y-0.5">
          <CardHeader className="border-b pb-6">
            <CardTitle>
              Subscription Status
            </CardTitle>
            <CardDescription className="mt-2">Your current plan and billing details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Plan</span>
              <Badge className={cn(
                "px-4 py-2 rounded-xl shadow-lg font-semibold text-sm min-w-[80px] justify-center border-0",
                getPlanBadgeColor(subscription?.planId || 'free')
              )}>
                {subscription?.planId ? subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1) : 'Free'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge className={cn(
                "px-4 py-2 rounded-xl shadow-lg font-semibold text-sm min-w-[80px] justify-center border-0",
                getStatusBadgeColor(subscription?.status || 'active')
              )}>
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
                  className="w-full hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  onClick={() => window.location.href = '/dashboard/billing'}
                >
                  Manage Subscription
                </Button>
              ) : (
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
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
      <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden hover:-translate-y-0.5">
        <CardHeader className="border-b pb-6">
          <CardTitle>
            Security Settings
          </CardTitle>
          <CardDescription className="mt-2">Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-gray-600">Change your account password</p>
            </div>
            <Button
              variant="outline"
              className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              onClick={handleChangePassword}
            >
              Change Password
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-gray-600">Add an extra layer of security</p>
            </div>
            <Button variant="outline" className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" disabled>Coming Soon</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}