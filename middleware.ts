import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/dashboard']

// Routes that require admin access
const adminRoutes = ['/dashboard/blog']

// Routes that require subscription (excluding free features)
const subscriptionRoutes: string[] = [
  // Currently no routes require subscription check in middleware
  // Individual pages can use SubscriptionGate component instead
]

// Public routes that should redirect to dashboard if authenticated
const authRoutes = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  const isAuthRoute = authRoutes.includes(request.nextUrl.pathname)
  const isAdminRoute = adminRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  const isSubscriptionRoute = subscriptionRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // If user is not signed in and the current path is on the dashboard, redirect to homepage with signin modal
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/?signin=true', request.url))
  }

  // If user is signed in but accessing dashboard, check for valid subscription
  if (isProtectedRoute && user) {
    try {
      // Get user's subscription status
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('plan_id, status, current_period_end')
        .eq('user_id', user.id)
        .single()

      // If no subscription exists, redirect to pricing
      if (!subscription || subError) {
        console.log('No subscription found, redirecting to pricing')
        return NextResponse.redirect(new URL('/pricing?reason=no-subscription', request.url))
      }

      // If subscription is not active or trialing, redirect to pricing
      if (!['active', 'trialing'].includes(subscription.status)) {
        console.log('Inactive subscription, redirecting to pricing')
        return NextResponse.redirect(new URL('/pricing?reason=inactive-subscription', request.url))
      }

      // Check if subscription has expired
      if (subscription.current_period_end) {
        const periodEnd = new Date(subscription.current_period_end)
        if (periodEnd < new Date()) {
          console.log('Expired subscription, redirecting to pricing')
          return NextResponse.redirect(new URL('/pricing?reason=expired-subscription', request.url))
        }
      }
    } catch (error) {
      console.error('Error checking subscription in middleware:', error)
      return NextResponse.redirect(new URL('/pricing?reason=error', request.url))
    }
  }

  // If user is signed in and the current path is login or signup, redirect to dashboard
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check admin access for blog management routes
  if (isAdminRoute && user) {
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!adminUser) {
      // Not an admin, redirect to dashboard with error
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
    }
  }

  // Check subscription status for subscription-required routes
  if (isSubscriptionRoute && user) {
    try {
      // Get user's subscription status directly from the table
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('plan_id, status')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'past_due'])
        .single()

      console.log('Bulk upload access check:', {
        userId: user.id,
        subscription,
        subError,
        path: request.nextUrl.pathname
      })

      // If no subscription or on free plan, redirect to homepage pricing
      if (!subscription || subscription.plan_id === 'free') {
        console.log('Redirecting: No subscription or free plan')
        return NextResponse.redirect(new URL('/pricing', request.url))
      }

      // Check if subscription is active or in trial
      if (!['active', 'trialing'].includes(subscription.status)) {
        console.log('Redirecting: Invalid subscription status')
        return NextResponse.redirect(new URL('/pricing', request.url))
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
      // No subscription found, redirect to pricing
      return NextResponse.redirect(new URL('/#pricing', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}