'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Home,
  PlusCircle,
  Grid3x3,
  Calendar,
  FileText,
  Clock,
  Send,
  Edit,
  BarChart3,
  Settings,
  Users,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronUp,
  Menu,
  X
} from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Create',
    icon: PlusCircle,
    children: [
      { name: 'New Post', href: '/dashboard/create/new', icon: Edit },
      { name: 'MultiPost', href: '/dashboard/create/multi', icon: Grid3x3 },
    ],
  },
  {
    name: 'Posts',
    icon: FileText,
    children: [
      { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
      { name: 'All', href: '/dashboard/posts', icon: FileText },
      { name: 'Scheduled', href: '/dashboard/posts/scheduled', icon: Clock },
      { name: 'Posted', href: '/dashboard/posts/posted', icon: Send },
      { name: 'Drafts', href: '/dashboard/posts/drafts', icon: Edit },
    ],
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Create', 'Posts'])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    )
  }

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center px-4 border-b">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="text-xl font-bold">Social Scheduler</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Button className="w-full mb-4" size="lg">
          <PlusCircle className="mr-2 h-5 w-5" />
          Create a Post
        </Button>

        <nav className="space-y-1">
          {navigation.map((item) => (
            <div key={item.name}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 transition-colors',
                      expandedItems.includes(item.name) && 'bg-gray-100'
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </div>
                    {expandedItems.includes(item.name) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {expandedItems.includes(item.name) && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 transition-colors',
                            pathname === child.href && 'bg-primary text-white hover:bg-primary/90'
                          )}
                        >
                          <child.icon className="mr-3 h-4 w-4" />
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href!}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 transition-colors',
                    pathname === item.href && 'bg-primary text-white hover:bg-primary/90'
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t p-4">
        <button
          onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
          className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full mr-3" />
            <span>Account</span>
          </div>
          {isAccountMenuOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {isAccountMenuOpen && (
          <div className="mt-2 space-y-1">
            <Link
              href="/dashboard/settings/account"
              className="flex items-center rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
            >
              <Users className="mr-3 h-4 w-4" />
              Manage Account
            </Link>
            <Link
              href="/dashboard/settings/billing"
              className="flex items-center rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
            >
              <CreditCard className="mr-3 h-4 w-4" />
              Billing
            </Link>
            <Link
              href="/dashboard/settings/plans"
              className="flex items-center rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
            >
              <Settings className="mr-3 h-4 w-4" />
              Plans
            </Link>
            <Link
              href="/support"
              className="flex items-center rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
            >
              <HelpCircle className="mr-3 h-4 w-4" />
              Support
            </Link>
            <button
              onClick={() => {
                // Handle logout
              }}
              className="w-full flex items-center rounded-lg px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile sidebar */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity',
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-64 bg-white border-r transform transition-transform lg:hidden',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r">
          <SidebarContent />
        </div>
      </aside>
    </>
  )
}