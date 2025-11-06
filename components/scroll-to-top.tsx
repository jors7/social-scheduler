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
 * Key Implementation:
 * - Temporarily disables CSS scroll-behavior: smooth during route changes
 * - Scrolls instantly to prevent erratic behavior during content loading
 * - Restores smooth scrolling after scroll completes for in-page navigation
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

    // CRITICAL FIX: Temporarily disable CSS scroll-behavior
    // The CSS scroll-behavior: smooth overrides JS behavior parameter
    // We must disable it at the CSS level for instant scrolling
    const html = document.documentElement
    const originalScrollBehavior = html.style.scrollBehavior

    // Force instant scrolling by setting CSS to 'auto'
    html.style.scrollBehavior = 'auto'

    // Scroll immediately (now instant because CSS is 'auto')
    window.scrollTo(0, 0)

    // Restore CSS scroll-behavior after scroll completes
    // This ensures in-page hash links still scroll smoothly
    const timeoutId = setTimeout(() => {
      html.style.scrollBehavior = originalScrollBehavior || 'smooth'
    }, 50)

    // Cleanup timeout on unmount
    return () => clearTimeout(timeoutId)
  }, [pathname]) // Re-run whenever the route changes

  // This component doesn't render anything
  return null
}
