import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams, origin, hash } = requestUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Check for error parameters in hash (Supabase sends errors this way)
  const errorParam = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')

  // Enhanced logging
  console.log('🔐 Auth callback received:', {
    code: code?.substring(0, 10),
    next,
    origin,
    error: errorParam,
    errorCode,
    errorDescription,
    allParams: Array.from(searchParams.entries()),
    hash: hash,
    fullUrl: request.url,
    headers: {
      host: request.headers.get('host'),
      referer: request.headers.get('referer'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
    }
  })

  // Handle errors from Supabase
  if (errorParam || errorCode) {
    console.error('❌ Auth error received:', { errorParam, errorCode, errorDescription })

    // Map error codes to user-friendly messages
    let userMessage = 'Authentication failed. Please try again.'

    if (errorCode === 'otp_expired') {
      userMessage = 'This link has expired. Please request a new magic link.'
    } else if (errorCode === 'access_denied' || errorParam === 'access_denied') {
      userMessage = 'Access denied. The authentication link may have already been used.'
    } else if (errorDescription) {
      // Use the error description if available
      userMessage = decodeURIComponent(errorDescription)
    }

    // Redirect to homepage with error message and signin modal open
    const errorUrl = new URL('/', origin)
    errorUrl.searchParams.set('signin', 'true')
    errorUrl.searchParams.set('error', userMessage)

    return NextResponse.redirect(errorUrl.toString())
  }

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

      // Redirect to homepage with error
      const errorUrl = new URL('/', origin)
      errorUrl.searchParams.set('signin', 'true')
      errorUrl.searchParams.set('error', 'Authentication failed. The link may have expired or already been used.')

      return NextResponse.redirect(errorUrl.toString())
    }
  }

  // No code provided - invalid request
  console.log('⚠️ No code provided, redirecting with error')
  const errorUrl = new URL('/', origin)
  errorUrl.searchParams.set('signin', 'true')
  errorUrl.searchParams.set('error', 'Invalid authentication link.')

  return NextResponse.redirect(errorUrl.toString())
}