import { Sidebar } from '@/components/dashboard/sidebar'
import { SubscriptionProvider } from '@/providers/subscription-provider'
import { OnboardingProvider } from '@/providers/onboarding-provider'
import { ThreadsTokenRefresher } from '@/components/dashboard/threads-token-refresher'
import { HelpCenterProvider } from '@/components/help-center/help-center-provider'
import { HelpCenterWidget } from '@/components/help-center/help-center-widget'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SubscriptionProvider>
      <OnboardingProvider>
        <HelpCenterProvider>
          <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <ThreadsTokenRefresher />
            <HelpCenterWidget />
            <div className="lg:pl-64">
              <main className="py-6 px-4 sm:px-6 lg:px-8">
                {children}
              </main>
            </div>
          </div>
        </HelpCenterProvider>
      </OnboardingProvider>
    </SubscriptionProvider>
  )
}