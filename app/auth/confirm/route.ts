import { NextRequest, NextResponse } from 'next/server'
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

    // Verify the token and get the user
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: type as any,
    })

    if (error || !data.user) {
      console.error('❌ Auth verification failed:', error)
      return NextResponse.redirect(
        new URL('/?error=auth_verification_failed', process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    console.log('✅ Auth verified for user:', data.user.id)

    // Create a response that will redirect
    const response = NextResponse.redirect(
      new URL(redirectTo || '/dashboard?subscription=success', process.env.NEXT_PUBLIC_APP_URL!)
    )

    // Set auth cookies manually
    if (data.session) {
      const maxAge = 60 * 60 * 24 * 7 // 7 days

      response.cookies.set('sb-access-token', data.session.access_token, {
        path: '/',
        maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })

      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        path: '/',
        maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    }

    return response

  } catch (error) {
    console.error('❌ Auth confirm error:', error)
    return NextResponse.redirect(
      new URL('/?error=auth_confirm_error', process.env.NEXT_PUBLIC_APP_URL!)
    )
  }
}
