'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSubscriptionContext } from '@/providers/subscription-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, ImageIcon, Sparkles, Crown, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MediaLibraryGateProps {
  children: React.ReactNode
  className?: string
}

export function MediaLibraryGate({ children, className }: MediaLibraryGateProps) {
  const { subscription, loading } = useSubscriptionContext()
  const router = useRouter()

  // Check if user has Pro or Enterprise plan
  const hasAccess = subscription?.planId === 'professional' || subscription?.planId === 'enterprise'

  const handleUpgrade = () => {
    router.push('/pricing')
  }

  // Don't show loading state if we have cached data
  if (loading && !subscription) {
    return (
      <div className={cn("relative min-h-[400px]", className)}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className={cn("relative", className)}>
        {/* Blurred content behind */}
        <div className="pointer-events-none select-none blur-sm opacity-50">
          {children}
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-background/30 backdrop-blur-sm z-10">
          <div className="absolute top-24 left-1/2 -translate-x-1/2 max-w-md w-full px-4">
            <Card className="shadow-2xl border-2">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl">Media Library is a Pro Feature</CardTitle>
                <CardDescription className="mt-2">
                  Upgrade to Professional or Enterprise to unlock the Media Library and manage all your visual content in one place
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Crown className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Professional: 250MB Storage</p>
                      <p className="text-sm text-muted-foreground">Store and organize your images and videos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Quick Access</p>
                      <p className="text-sm text-muted-foreground">Reuse media across multiple posts instantly</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Enterprise: 500MB Storage</p>
                      <p className="text-sm text-muted-foreground">Double the storage for larger teams</p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button 
                    onClick={handleUpgrade} 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" 
                    size="lg"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to Pro
                  </Button>
                  <p className="text-center text-xs text-muted-foreground mt-3">
                    Starting at $19/month with all premium features
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // User has access, show content normally
  return <>{children}</>
}