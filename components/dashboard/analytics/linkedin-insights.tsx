'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Eye, 
  Users, 
  TrendingUp,
  Activity,
  Info,
  Linkedin,
  Search,
  UserPlus,
  MessageCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LinkedInInsightsProps {
  className?: string
}

export function LinkedInInsights({ className }: LinkedInInsightsProps) {
  const [loading, setLoading] = useState(false)
  const [hasLinkedInAccount, setHasLinkedInAccount] = useState(false)
  const [linkedInAccounts, setLinkedInAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)

  const fetchLinkedInInsights = async (accountId?: string) => {
    try {
      setLoading(true)
      
      // Check if LinkedIn account is connected
      const accountResponse = await fetch('/api/social-accounts')
      if (accountResponse.ok) {
        const accounts = await accountResponse.json()
        const linkedInAccountsList = accounts.filter((acc: any) => acc.platform === 'linkedin' && acc.is_active)
        
        if (linkedInAccountsList.length === 0) {
          setHasLinkedInAccount(false)
          return
        }
        
        setHasLinkedInAccount(true)
        setLinkedInAccounts(linkedInAccountsList)
        
        // Select account to use
        const accountToUse = accountId 
          ? linkedInAccountsList.find((acc: any) => acc.id === accountId) 
          : selectedAccount 
          || linkedInAccountsList[0]
        
        setSelectedAccount(accountToUse)
      } else {
        return
      }

      // For now, we're not fetching real insights as LinkedIn API requires special access
      // Keep this code for future when we get API approval
      /*
      const queryParams = new URLSearchParams({
        type: 'profile',
        period: selectedPeriod,
        ...(selectedAccount?.id && { accountId: selectedAccount.id })
      })
      const profileInsightsResponse = await fetch(`/api/linkedin/insights?${queryParams}`)
      if (profileInsightsResponse.ok) {
        const data = await profileInsightsResponse.json()
        setProfileInsights(data.insights)
      }

      const postsQueryParams = new URLSearchParams({
        limit: '5',
        ...(selectedAccount?.id && { accountId: selectedAccount.id })
      })
      const postsResponse = await fetch(`/api/linkedin/posts?${postsQueryParams}`)
      if (postsResponse.ok) {
        const { media } = await postsResponse.json()
        setRecentPosts(media || [])
      }
      */
    } catch (error) {
      console.error('Error fetching LinkedIn insights:', error)
      toast.error('Failed to load LinkedIn insights')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Add a small delay to prevent rapid re-renders
    const timer = setTimeout(() => {
      fetchLinkedInInsights()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = async () => {
    // No real data to refresh yet, but keep for future use
    toast.info('LinkedIn analytics will be available once API access is approved')
  }

  if (!hasLinkedInAccount) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5" />
            LinkedIn Insights
          </CardTitle>
          <CardDescription>
            Connect your LinkedIn account to view insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Linkedin className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No LinkedIn account connected
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/settings'}>
              Connect LinkedIn
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show coming soon message for connected accounts
  if (hasLinkedInAccount) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5" />
            LinkedIn Insights
            <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
          </CardTitle>
          <CardDescription>
            {selectedAccount 
              ? `Connected: ${selectedAccount.display_name || selectedAccount.username}`
              : 'Advanced analytics for your LinkedIn presence'}
          </CardDescription>
          {linkedInAccounts.length > 1 && (
            <div className="mt-2">
              <select
                className="text-sm border rounded-lg px-3 py-1.5 bg-white"
                value={selectedAccount?.id || ''}
                onChange={(e) => {
                  const account = linkedInAccounts.find(acc => acc.id === e.target.value)
                  if (account) {
                    setSelectedAccount(account)
                  }
                }}
              >
                {linkedInAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.display_name || account.username}
                  </option>
                ))}
              </select>
              <span className="ml-2 text-xs text-gray-500">
                {linkedInAccounts.length} account{linkedInAccounts.length !== 1 ? 's' : ''} connected
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Coming Soon Message */}
            <div className="text-center py-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <Linkedin className="mx-auto h-16 w-16 text-blue-700 mb-4" />
              <h3 className="text-lg font-semibold mb-2">LinkedIn Analytics Coming Soon!</h3>
              <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                We&apos;re working on bringing you comprehensive LinkedIn analytics. 
                This feature requires approval for LinkedIn&apos;s Community Management API.
              </p>
              <Badge variant="outline" className="mb-4">
                API Access Pending Approval
              </Badge>
            </div>

            {/* What to Expect */}
            <div className="border rounded-lg p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                What Analytics Will Be Available
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Eye className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Profile Views</p>
                      <p className="text-xs text-gray-500">Track who&apos;s viewing your profile</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Activity className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Post Impressions</p>
                      <p className="text-xs text-gray-500">See your content reach</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Follower Growth</p>
                      <p className="text-xs text-gray-500">Monitor your audience expansion</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Search className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Search Appearances</p>
                      <p className="text-xs text-gray-500">How often you appear in search</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Engagement Metrics</p>
                      <p className="text-xs text-gray-500">Likes, comments, and shares</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <UserPlus className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium text-sm">Connection Analytics</p>
                      <p className="text-xs text-gray-500">Network growth insights</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Why is this feature pending?</p>
                  <p className="text-blue-700">
                    LinkedIn requires approval for their Community Management API to access analytics data. 
                    We&apos;ve applied for access and will enable this feature as soon as we receive approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // This return should never be reached, but kept for TypeScript
  return null
}