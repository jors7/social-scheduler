'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useHelpCenter } from '@/components/help-center/help-center-provider'
import { useSidebar } from '@/contexts/sidebar-context'
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
  ChevronLeft,
  ChevronsLeft,
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
  const { openWidget: openHelpCenter } = useHelpCenter()
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Create', 'Posts', 'Blog', 'Admin'])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>(navigation)

  // Scroll fade indicators
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showTopFade, setShowTopFade] = useState(false)
  const [showBottomFade, setShowBottomFade] = useState(false)

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const hasOverflow = scrollHeight > clientHeight
      setShowTopFade(scrollTop > 10)
      setShowBottomFade(hasOverflow && scrollTop < scrollHeight - clientHeight - 10)
    }
  }, [])

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (scrollElement && !isCollapsed) {
      // Initial check with delay to ensure content is rendered
      const timeoutId = setTimeout(checkScroll, 100)

      scrollElement.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)

      // Also check periodically for content changes
      const intervalId = setInterval(checkScroll, 500)

      return () => {
        clearTimeout(timeoutId)
        clearInterval(intervalId)
        scrollElement.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }
  }, [checkScroll, isCollapsed, navigationItems])
  
  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

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
          badge: null,
        },
        // Admin Dashboard
        {
          name: 'Admin Dashboard',
          href: '/admin',
          icon: Shield,
          badge: null,
        },
        // SEO Settings
        {
          name: 'SEO Settings',
          href: '/dashboard/seo',
          icon: Search,
          badge: null,
        },
        // Twitter Usage Monitor
        {
          name: 'Twitter Usage',
          href: '/dashboard/admin/twitter-usage',
          icon: BarChart3,
          badge: null,
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
        router.push('/')
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

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className={cn("flex flex-col h-full", collapsed && "overflow-visible")}>
      {/* Logo Section */}
      <div className={cn(
        "flex bg-white border-b transition-all duration-300 shrink-0",
        collapsed ? "flex-col items-center px-3 py-3" : "flex-row items-center justify-between min-h-[64px] h-16 px-4"
      )}>
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp"
            alt="SocialCal Logo"
            width={28}
            height={28}
            className="w-7 h-7"
          />
          {!collapsed && (
            <span
              className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent"
              style={{
                fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                fontWeight: 800
              }}
            >
              SocialCal
            </span>
          )}
        </Link>
        {/* Collapse toggle - desktop only */}
        {!isMobileMenuOpen && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200",
              collapsed && "mt-2"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronsLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        )}
      </div>

      <div className={cn(
        "flex-1 relative bg-gray-50 min-h-0",
        collapsed ? "overflow-visible" : "overflow-hidden"
      )}>
        {/* Top fade indicator */}
        {!collapsed && showTopFade && (
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-gray-50 to-transparent z-10 pointer-events-none" />
        )}
        {/* Bottom fade indicator */}
        {!collapsed && showBottomFade && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent z-10 pointer-events-none" />
        )}
        <div
          ref={!collapsed ? scrollRef : undefined}
          className={cn(
            collapsed ? "overflow-visible" : "absolute inset-0 overflow-y-auto scrollbar-hide"
          )}
        >
        {/* Create Post Button */}
        <div className={cn("py-4 transition-all duration-300", collapsed ? "px-2" : "px-4")}>
          {collapsed ? (
            <div className="relative group/create hover:z-[100]">
              <Link href="/dashboard/create/new" onClick={() => setIsMobileMenuOpen(false)}>
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 p-2"
                  size="icon"
                >
                  <Sparkles className="h-5 w-5" />
                </Button>
              </Link>
              {/* Tooltip */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 pl-2 opacity-0 invisible group-hover/create:opacity-100 group-hover/create:visible transition-all duration-200 z-[100]">
                <div className="absolute left-0 top-0 w-2 h-full" />
                <div className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap">
                  Create New Post
                </div>
              </div>
            </div>
          ) : (
            <Link href="/dashboard/create/new" onClick={() => setIsMobileMenuOpen(false)}>
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200" size="lg">
                <Sparkles className="mr-2 h-5 w-5" />
                Create New Post
              </Button>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("space-y-1 transition-all duration-300", collapsed ? "px-2 overflow-visible" : "px-4")}>
          {!collapsed && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Main Menu</p>}
          {navigationItems.map((item) => {
            // Handle divider
            if (item.isDivider) {
              return (
                <div key={item.name} className="py-2">
                  <div className="border-t border-gray-200"></div>
                  {!collapsed && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-3 px-3">
                      Admin Tools
                    </p>
                  )}
                </div>
              )
            }

            return (
            <div key={item.name}>
              {item.children ? (
                collapsed ? (
                  // Collapsed: show hover flyout menu
                  <div className="relative group/flyout hover:z-[100]">
                    <div
                      className={cn(
                        'flex items-center justify-center rounded-xl p-2.5 transition-all duration-200 cursor-pointer',
                        item.children.some(c => pathname === c.href)
                          ? 'bg-purple-50 border border-purple-200 text-purple-700'
                          : 'hover:bg-white hover:shadow-sm text-gray-700 hover:text-purple-600 group-hover/flyout:bg-white group-hover/flyout:shadow-sm'
                      )}
                    >
                      {item.icon && (
                        <div className={cn(
                          'p-2 rounded-lg transition-colors',
                          item.children.some(c => pathname === c.href)
                            ? 'bg-purple-200 text-purple-700'
                            : 'bg-gray-100 text-gray-500 group-hover/flyout:bg-purple-100 group-hover/flyout:text-purple-600'
                        )}>
                          <item.icon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    {/* Flyout menu */}
                    <div className="absolute left-full top-0 pl-2 opacity-0 invisible group-hover/flyout:opacity-100 group-hover/flyout:visible transition-all duration-200 z-[100]">
                      {/* Invisible bridge to maintain hover */}
                      <div className="absolute left-0 top-0 w-2 h-full" />
                      <div className="py-2 px-1 bg-white rounded-xl shadow-lg border border-gray-100 min-w-[160px]">
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {item.name}
                        </div>
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              'flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-200 mx-1',
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
                    </div>
                  </div>
                ) : (
                  // Expanded: show normal expandable menu
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
                        {item.icon && (
                          <div className={cn(
                            'p-2 rounded-lg mr-3 transition-colors',
                            expandedItems.includes(item.name)
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600'
                          )}>
                            <item.icon className="h-4 w-4" />
                          </div>
                        )}
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
                            onClick={() => setIsMobileMenuOpen(false)}
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
                )
              ) : collapsed ? (
                // Collapsed: show hover tooltip
                <div className="relative group/tooltip hover:z-[100]">
                  <Link
                    href={item.href!}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-center rounded-xl p-2.5 transition-all duration-200',
                      pathname === item.href
                        ? 'bg-purple-50 border border-purple-200 text-purple-700'
                        : 'hover:bg-white hover:shadow-sm text-gray-700 hover:text-purple-600 group-hover/tooltip:bg-white group-hover/tooltip:shadow-sm'
                    )}
                  >
                    {item.icon && (
                      <div className={cn(
                        'p-2 rounded-lg transition-colors',
                        pathname === item.href
                          ? 'bg-purple-200 text-purple-700'
                          : 'bg-gray-100 text-gray-500 group-hover/tooltip:bg-purple-100 group-hover/tooltip:text-purple-600'
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                    )}
                  </Link>
                  {/* Tooltip */}
                  <div className="absolute left-full top-1/2 -translate-y-1/2 pl-2 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[100]">
                    {/* Invisible bridge to maintain hover */}
                    <div className="absolute left-0 top-0 w-2 h-full" />
                    <div className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap">
                      {item.name}
                      {item.badge && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold bg-purple-500 text-white rounded">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Expanded: show normal link
                <Link
                  href={item.href!}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group',
                    pathname === item.href
                      ? 'bg-purple-50 border border-purple-200 text-purple-700'
                      : 'hover:bg-white hover:shadow-sm text-gray-700 hover:text-purple-600'
                  )}
                >
                  <div className="flex items-center">
                    {item.icon && (
                      <div className={cn(
                        'p-2 rounded-lg mr-3 transition-colors',
                        pathname === item.href
                          ? 'bg-purple-200 text-purple-700'
                          : 'bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600'
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                    )}
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
      </div>

      {/* Account Section */}
      <div className={cn(
        "bg-white border-t mt-auto relative transition-all duration-300",
        collapsed ? "p-2" : "p-3"
      )}>
        {collapsed ? (
          // Collapsed: show hover flyout
          <div className="relative group/account hover:z-[100]">
            <div className="w-full flex items-center justify-center rounded-xl p-2 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-semibold shadow-md text-sm">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
            </div>
            {/* Flyout menu */}
            <div className="absolute left-full bottom-0 pl-2 opacity-0 invisible group-hover/account:opacity-100 group-hover/account:visible transition-all duration-200 z-[100]">
              {/* Invisible bridge to maintain hover */}
              <div className="absolute left-0 top-0 w-2 h-full" />
              <div className="py-2 px-1 bg-white rounded-xl shadow-lg border border-gray-100 min-w-[180px]">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  My Account
                </div>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors mx-1"
                >
                  <User className="mr-2 h-3.5 w-3.5 text-gray-500" />
                  Profile Settings
                </Link>
                <Link
                  href="/dashboard/billing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors mx-1"
                >
                  <Crown className="mr-2 h-3.5 w-3.5 text-gray-500" />
                  Subscription
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    openHelpCenter()
                  }}
                  className="w-full flex items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors mx-1"
                >
                  <LifeBuoy className="mr-2 h-3.5 w-3.5 text-gray-500" />
                  Help & Support
                </button>
                <div className="border-t border-gray-100 mt-1 pt-1 mx-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Expanded: show click-to-expand menu
          <>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsAccountMenuOpen(!isAccountMenuOpen)
              }}
              className="w-full flex items-center justify-between rounded-xl px-3 py-2 hover:bg-gray-50 transition-all duration-200 relative z-10"
            >
              <div className="flex items-center">
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-semibold shadow-md text-sm">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"></div>
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
              <div className="mt-2 space-y-0.5 relative z-20">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-1.5 bg-gray-100 rounded-lg mr-3">
                    <User className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                  Profile Settings
                </Link>
                <Link
                  href="/dashboard/billing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-1.5 bg-gray-100 rounded-lg mr-3">
                    <Crown className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                  Subscription
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    openHelpCenter()
                  }}
                  className="w-full flex items-center rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-1.5 bg-gray-100 rounded-lg mr-3">
                    <LifeBuoy className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                  Help & Support
                </button>
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
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button - positioned absolute (not sticky) and aligned right */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden absolute top-4 right-4 z-50 p-2 rounded-lg bg-white shadow-md"
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
          'fixed top-0 left-0 z-40 h-full w-64 bg-white border-r transform transition-transform lg:hidden overflow-y-auto',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent collapsed={false} />
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex lg:fixed lg:inset-y-0 lg:flex-col transition-all duration-300 z-40",
        isCollapsed ? "lg:w-[72px] overflow-visible" : "lg:w-64"
      )}>
        <div className={cn(
          "flex flex-col bg-white border-r shadow-xl h-screen",
          isCollapsed && "overflow-visible"
        )}>
          <SidebarContent collapsed={isCollapsed} />
        </div>
      </aside>
    </>
  )
}