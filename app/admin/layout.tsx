import { redirect } from 'next/navigation'
import { isAdmin, getAdminUser } from '@/lib/admin/auth'
import Link from 'next/link'
import { 
  Users, 
  BarChart3, 
  Settings, 
  Shield, 
  FileText,
  Home,
  ArrowLeft,
  LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if user is admin
  const isUserAdmin = await isAdmin()
  if (!isUserAdmin) {
    redirect('/dashboard')
  }

  const adminUser = await getAdminUser()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-xs text-gray-500">
                  {adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin'} • {adminUser?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white border-r border-gray-200">
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Home className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Overview</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Users className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Users</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/analytics"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <BarChart3 className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Analytics</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/audit"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FileText className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Audit Log</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/settings"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Settings className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Settings</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}