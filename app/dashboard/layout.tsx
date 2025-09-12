import { Sidebar } from '@/components/dashboard/sidebar'
import { SubscriptionProvider } from '@/providers/subscription-provider'
import { ThreadsTokenRefresher } from '@/components/dashboard/threads-token-refresher'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SubscriptionProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <ThreadsTokenRefresher />
        <div className="lg:pl-64">
          <main className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </SubscriptionProvider>
  )
}