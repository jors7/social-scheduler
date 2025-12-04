import { Sidebar } from '@/components/dashboard/sidebar'
import { SubscriptionProvider } from '@/providers/subscription-provider'
import { OnboardingProvider } from '@/providers/onboarding-provider'
import { ThreadsTokenRefresher } from '@/components/dashboard/threads-token-refresher'
import { HelpCenterProvider } from '@/components/help-center/help-center-provider'
import { HelpCenterWidget } from '@/components/help-center/help-center-widget'
import { SidebarProvider } from '@/contexts/sidebar-context'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SubscriptionProvider>
      <OnboardingProvider>
        <SidebarProvider>
          <HelpCenterProvider>
            <div className="min-h-screen bg-gray-50">
              <Sidebar />
              <ThreadsTokenRefresher />
              <HelpCenterWidget />
              <DashboardContent>
                {children}
              </DashboardContent>
            </div>
          </HelpCenterProvider>
        </SidebarProvider>
      </OnboardingProvider>
    </SubscriptionProvider>
  )
}