import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { syncUserSubscription } from '@/lib/subscription/sync'

export async function POST(request: NextRequest) {
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`API: Syncing subscription for user ${user.id}`)
    
    // Sync the user's subscription
    const result = await syncUserSubscription(user.id)
    
    if (!result.success) {
      console.error('API: Sync failed:', result.error)
      return NextResponse.json({ 
        error: result.error || 'Failed to sync subscription' 
      }, { status: 400 })
    }
    
    console.log('API: Sync successful')
    return NextResponse.json({ 
      success: true,
      message: 'Subscription synced successfully'
    })
    
  } catch (error: any) {
    console.error('API: Sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}