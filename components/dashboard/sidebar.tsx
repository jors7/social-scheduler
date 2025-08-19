'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  PenSquare,
  FileStack,
  Calendar,
  FileText,
  Clock,
  Send,
  Edit3,
  TrendingUp,
  Settings,
  User,
  CreditCard,
  LifeBuoy,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Upload,
  ImageIcon,
  Sparkles,
  Crown,
  Zap,
  Activity,
  Search,
  BookOpen,
  Users,
  Shield,
  Database,
  BarChart3,
  FileCode,
  Bell,
  Mail,
  LucideIcon
} from 'lucide-react'

type NavigationItem = {
  name: string
  href?: string
  icon?: LucideIcon
  badge?: string | null
  children?: Array<{
    name: string
    href: string
    icon: LucideIcon
  }>
  isDivider?: boolean
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'Create',
    icon: PenSquare,
    badge: null,
    children: [
      { name: 'New Post', href: '/dashboard/create/new', icon: Edit3 },
      { name: 'Bulk Upload', href: '/dashboard/create/bulk', icon: Upload },
    ],
  },
  {
    name: 'Posts',
    icon: FileStack,
    badge: null,
    children: [
      { name: 'Calendar View', href: '/dashboard/calendar', icon: Calendar },
      { name: 'All Posts', href: '/dashboard/posts', icon: FileText },
      { name: 'Scheduled', href: '/dashboard/posts/scheduled', icon: Clock },
      { name: 'Published', href: '/dashboard/posts/posted', icon: Send },
      { name: 'Drafts', href: '/dashboard/posts/drafts', icon: Edit3 },
    ],
  },
  {
    name: 'Media Library',
    href: '/dashboard/media',
    icon: ImageIcon,
    badge: 'Pro',
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: TrendingUp,
    badge: null,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    badge: null,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Create', 'Posts', 'Blog', 'Admin'])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>(navigation)
  
  useEffect(() => {
    loadUser()
    
    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
      }
    })
    
    // Reload user data when pathname changes (in case profile was updated)
    return () => subscription.unsubscribe()
  }, [pathname])
  
  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)
    
    // Add admin sections for admin user
    if (user?.email === 'jan.orsula1@gmail.com') {
      const adminNav = [...navigation]
      
      // Add admin sections at the end
      adminNav.push(
        // Admin divider (we'll handle this in rendering)
        {
          name: 'divider-admin',
          isDivider: true,
        },
        // Blog Management
        {
          name: 'Blog Management',
          href: '/dashboard/blog',
          icon: BookOpen,
          badge: 'Admin',
        },
        // Admin Dashboard
        {
          name: 'Admin Dashboard',
          href: '/admin',
          icon: Shield,
          badge: 'Admin',
        },
        // SEO Settings
        {
          name: 'SEO Settings',
          href: '/dashboard/seo',
          icon: Search,
          badge: 'Admin',
        }
      )
      
      setNavigationItems(adminNav)
    } else {
      setNavigationItems(navigation)
    }
  }
  
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })
      
      if (response.ok) {
        toast.success('Logged out successfully')
        router.push('/login')
      } else {
        toast.error('Failed to logout')
      }
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('An error occurred while logging out')
    }
  }

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    )
  }

  const SidebarContent = () => (
    <>
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 bg-white border-b">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp" 
            alt="SocialCal Logo" 
            width={28} 
            height={28}
            className="w-7 h-7"
          />
          <span 
            className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent"
            style={{ 
              fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
              fontWeight: 800 
            }}
          >
            SocialCal
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 pb-20">
        {/* Create Post Button */}
        <div className="px-4 py-4">
          <Link href="/dashboard/create/new">
            <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200" size="lg">
              <Sparkles className="mr-2 h-5 w-5" />
              Create New Post
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="px-4 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Main Menu</p>
          {navigationItems.map((item) => {
            // Handle divider
            if (item.isDivider) {
              return (
                <div key={item.name} className="py-2">
                  <div className="border-t border-gray-200"></div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-3 px-3">
                    Admin Tools
                  </p>
                </div>
              )
            }
            
            return (
            <div key={item.name}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group',
                      expandedItems.includes(item.name) 
                        ? 'bg-gray-100 text-gray-900' 
                        : 'hover:bg-white hover:shadow-sm text-gray-700 hover:text-purple-600'
                    )}
                  >
                    <div className="flex items-center">
                      <div className={cn(
                        'p-2 rounded-lg mr-3 transition-colors',
                        expandedItems.includes(item.name)
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600'
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      {item.name}
                    </div>
                    <ChevronRight className={cn(
                      'h-4 w-4 transition-transform text-gray-400',
                      expandedItems.includes(item.name) && 'rotate-90'
                    )} />
                  </button>
                  {expandedItems.includes(item.name) && (
                    <div className="mt-1 ml-11 space-y-0.5">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-200',
                            pathname === child.href 
                              ? 'bg-purple-100 text-purple-700 font-medium' 
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          )}
                        >
                          <child.icon className="mr-2 h-3.5 w-3.5" />
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
                    'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group',
                    pathname === item.href 
                      ? 'bg-purple-50 border border-purple-200 text-purple-700' 
                      : 'hover:bg-white hover:shadow-sm text-gray-700 hover:text-purple-600'
                  )}
                >
                  <div className="flex items-center">
                    <div className={cn(
                      'p-2 rounded-lg mr-3 transition-colors',
                      pathname === item.href
                        ? 'bg-purple-200 text-purple-700'
                        : 'bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600'
                    )}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    {item.name}
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )}
            </div>
          )})}
        </nav>
      </div>

      {/* Account Section */}
      <div className="p-4 bg-white border-t mt-auto">
        <button
          onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
          className="w-full flex items-center justify-between rounded-xl px-3 py-3 hover:bg-gray-50 transition-all duration-200"
        >
          <div className="flex items-center">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-semibold shadow-md">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <div className="ml-3 text-left">
              <p className="text-sm font-semibold text-gray-900">My Account</p>
            </div>
          </div>
          <ChevronRight className={cn(
            'h-4 w-4 text-gray-400 transition-transform',
            isAccountMenuOpen && 'rotate-90'
          )} />
        </button>
        
        {isAccountMenuOpen && (
          <div className="mt-2 space-y-0.5">
            <Link
              href="/dashboard/profile"
              className="flex items-center rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="p-1.5 bg-gray-100 rounded-lg mr-3">
                <User className="h-3.5 w-3.5 text-gray-600" />
              </div>
              Profile Settings
            </Link>
            <Link
              href="/dashboard/billing"
              className="flex items-center rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="p-1.5 bg-gray-100 rounded-lg mr-3">
                <Crown className="h-3.5 w-3.5 text-gray-600" />
              </div>
              Subscription
            </Link>
            <Link
              href="/support"
              className="flex items-center rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="p-1.5 bg-gray-100 rounded-lg mr-3">
                <LifeBuoy className="h-3.5 w-3.5 text-gray-600" />
              </div>
              Help & Support
            </Link>
            <div className="pt-2 mt-2 border-t">
              <button
                onClick={handleLogout}
                className="w-full flex items-center rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <div className="p-1.5 bg-red-100 rounded-lg mr-3">
                  <LogOut className="h-3.5 w-3.5 text-red-600" />
                </div>
                Sign Out
              </button>
            </div>
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
        <div className="flex flex-col bg-white border-r shadow-xl h-screen">
          <SidebarContent />
        </div>
      </aside>
    </>
  )
}