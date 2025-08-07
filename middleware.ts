import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/dashboard']

// Routes that require subscription (excluding free features)
const subscriptionRoutes = [
  '/dashboard/create/bulk',
  '/dashboard/analytics',
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
  const isSubscriptionRoute = subscriptionRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // If user is not signed in and the current path is on the dashboard, redirect to login
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is signed in and the current path is login or signup, redirect to dashboard
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check subscription status for subscription-required routes
  if (isSubscriptionRoute && user) {
    try {
      // Get user's subscription status
      const { data: subscriptionData } = await supabase
        .rpc('get_user_subscription', { user_uuid: user.id })
        .single()

      // Type assertion for subscription data
      const subscription = subscriptionData as {
        plan_id: string;
        status: string;
      } | null

      // If no subscription or on free plan, redirect to homepage pricing
      if (!subscription || subscription.plan_id === 'free') {
        return NextResponse.redirect(new URL('/#pricing', request.url))
      }

      // Check if subscription is active or in trial
      if (!['active', 'trialing'].includes(subscription.status)) {
        return NextResponse.redirect(new URL('/#pricing', request.url))
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
      // Allow access but the component will handle subscription checks
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}