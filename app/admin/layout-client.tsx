'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  BarChart3,
  Settings,
  Shield,
  FileText,
  Home,
  ArrowLeft,
  Loader2,
  MessageSquarePlus,
  Menu,
  X,
  Lightbulb
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminUser, setAdminUser] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/debug')
      const data = await response.json()
      
      if (!data.auth?.isAdmin) {
        router.push('/dashboard')
        return
      }
      
      setIsAdmin(true)
      setAdminUser({
        email: data.auth.user?.email,
        role: data.auth.role
      })
    } catch (error) {
      console.error('Admin check error:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const isActive = (path: string) => {
    if (path === '/admin' && pathname === '/admin') return true
    if (path !== '/admin' && pathname?.startsWith(path)) return true
    return false
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {/* Mobile hamburger button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Shield className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  {adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin'} • {adminUser?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-red-600 mr-2" />
              <span className="font-semibold">Admin</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin') && pathname === '/admin'
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Home className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Overview</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/users')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Users className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Users</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/analytics"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/analytics')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Analytics</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/audit"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/audit')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <FileText className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Audit Log</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/platform-requests"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/platform-requests')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <MessageSquarePlus className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Platform Requests</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/feature-requests"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/feature-requests')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Lightbulb className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Feature Requests</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/settings"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/settings')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Settings className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Settings</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/test"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/test')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Shield className="h-5 w-5 mr-3 text-gray-400" />
                  <span>API Tests</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Desktop Sidebar Navigation */}
        <nav className="hidden md:block w-64 bg-white border-r border-gray-200">
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin') && pathname === '/admin'
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Home className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Overview</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/users')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Users className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Users</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/analytics"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/analytics')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Analytics</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/audit"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/audit')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <FileText className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Audit Log</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/platform-requests"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/platform-requests')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <MessageSquarePlus className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Platform Requests</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/feature-requests"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/feature-requests')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Lightbulb className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Feature Requests</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/settings"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/settings')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Settings className="h-5 w-5 mr-3 text-gray-400" />
                  <span>Settings</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/test"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/test')
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Shield className="h-5 w-5 mr-3 text-gray-400" />
                  <span>API Tests</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}