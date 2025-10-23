import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    const redirectTo = searchParams.get('redirect_to')

    if (!token || !type) {
      console.error('❌ Missing token or type in auth confirm')
      return NextResponse.redirect(
        new URL('/?error=invalid_auth_link', process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    console.log('🔐 Confirming auth with token type:', type)

    // Verify the token and get the session
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: type as any,
    })

    if (error || !data.user || !data.session) {
      console.error('❌ Auth verification failed:', error)
      return NextResponse.redirect(
        new URL('/?error=auth_verification_failed', process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    console.log('✅ Auth verified for user:', data.user.id)

    // Create a response that will redirect
    let response = NextResponse.redirect(
      new URL(redirectTo || '/dashboard?subscription=success', process.env.NEXT_PUBLIC_APP_URL!)
    )

    // Create a Supabase SSR client to set cookies properly
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

    // Set the session using Supabase SSR client
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    if (sessionError) {
      console.error('❌ Failed to set session:', sessionError)
      return NextResponse.redirect(
        new URL('/?error=session_set_failed', process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    console.log('✅ Session set successfully, redirecting to dashboard')

    return response

  } catch (error) {
    console.error('❌ Auth confirm error:', error)
    return NextResponse.redirect(
      new URL('/?error=auth_confirm_error', process.env.NEXT_PUBLIC_APP_URL!)
    )
  }
}
