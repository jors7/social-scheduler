import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv: process.env.NODE_ENV,
    expectedCallbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app'}/auth/callback`,
    instructions: {
      step1: 'Go to Supabase Dashboard → Authentication → URL Configuration',
      step2: 'Add this URL to Redirect URLs:',
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app'}/auth/callback`,
      step3: 'Also check Site URL is set to:',
      siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app'
    }
  })
}
