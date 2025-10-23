import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type')
    const next = requestUrl.searchParams.get('next') || '/dashboard'

    console.log('🔐 Magic link callback received:', {
      token_hash: token_hash?.substring(0, 10),
      type,
      next,
      fullUrl: request.url
    })

    if (token_hash && type) {
      // Build redirect URL with success parameter
      const redirectUrl = new URL(next, request.url)
      redirectUrl.searchParams.set('auth', 'success')

      let response = NextResponse.redirect(redirectUrl)

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              response.cookies.set({
                name,
                value,
                ...options,
              })
            },
            remove(name: string, options: CookieOptions) {
              response.cookies.set({
                name,
                value: '',
                ...options,
              })
            },
          },
        }
      )

      // Verify the OTP
      const { error } = await supabase.auth.verifyOtp({
        type: type as any,
        token_hash,
      })

      if (error) {
        console.error('❌ Magic link verification failed:', error.message)
        return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error.message)}`, request.url))
      }

      console.log('✅ Magic link verified successfully, redirecting to:', redirectUrl.toString())
      return response
    }

    // If no token, redirect to login
    console.log('⚠️ No token_hash provided')
    return NextResponse.redirect(new URL('/?signin=true', request.url))

  } catch (error) {
    console.error('❌ Magic link callback error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
}
