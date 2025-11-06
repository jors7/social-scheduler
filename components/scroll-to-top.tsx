'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * ScrollToTop Component
 *
 * Automatically scrolls to the top of the page on route changes.
 * This fixes Next.js App Router's scroll restoration behavior that can
 * cause pages to load at incorrect scroll positions.
 *
 * Usage: Add to root layout or any layout that needs scroll-to-top behavior
 */
export function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    // Disable browser's automatic scroll restoration
    // This prevents the browser from trying to restore scroll position on navigation
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual'
    }

    // Force instant scroll to top on route change
    // This happens immediately when pathname changes (on every navigation)
    window.scrollTo(0, 0)
  }, [pathname]) // Re-run whenever the route changes

  // This component doesn't render anything
  return null
}
