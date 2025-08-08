import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SubscriptionService } from '@/lib/subscription/service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get usage summary
    const subscriptionService = new SubscriptionService()
    const usage = await subscriptionService.getUsageSummary(user.id)

    return NextResponse.json(usage)
  } catch (error) {
    console.error('Usage API error:', error)
    return NextResponse.json(
      { error: 'Failed to get usage data' },
      { status: 500 }
    )
  }
}