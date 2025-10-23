import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Enhanced logging
  console.log('🔐 Auth callback received:', {
    code: code?.substring(0, 10),
    next,
    origin,
    allParams: Array.from(searchParams.entries()),
    fullUrl: request.url,
    headers: {
      host: request.headers.get('host'),
      referer: request.headers.get('referer'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
    }
  })

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      console.log('✅ Code exchanged successfully, redirecting to:', next)

      // Build redirect URL with success parameter
      const redirectUrl = new URL(next, origin)
      redirectUrl.searchParams.set('auth', 'success')

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(redirectUrl.toString())
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectUrl.pathname}${redirectUrl.search}`)
      } else {
        return NextResponse.redirect(redirectUrl.toString())
      }
    } else {
      console.error('❌ Code exchange failed:', error.message)
    }
  }

  // Return the user to an error page with instructions
  console.log('⚠️ No code provided, redirecting to error page')
  return NextResponse.redirect(`${origin}/auth/auth-error`)
}