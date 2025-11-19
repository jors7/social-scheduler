import { NextRequest, NextResponse } from 'next/server'

// Force rebuild - ensure cancel_at_period_end field is returned

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Direct database access without any auth
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${params.id}`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Database request failed: ${response.status}`)
    }
    
    const subscriptions = await response.json()
    const subscription = subscriptions[0]
    
    // Get posts count
    const postsResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/scheduled_posts?user_id=eq.${params.id}&select=count`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        'Prefer': 'count=exact',
      },
    })
    
    const postsCount = parseInt(postsResponse.headers.get('content-range')?.split('/')[1] || '0')
    
    // Get drafts count
    const draftsResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/drafts?user_id=eq.${params.id}&select=count`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        'Prefer': 'count=exact',
      },
    })
    
    const draftsCount = parseInt(draftsResponse.headers.get('content-range')?.split('/')[1] || '0')
    
    // Get accounts count
    const accountsResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/social_accounts?user_id=eq.${params.id}&select=count`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        'Prefer': 'count=exact',
      },
    })
    
    const accountsCount = parseInt(accountsResponse.headers.get('content-range')?.split('/')[1] || '0')
    
    // Get user email from auth.users via admin API if service key available
    let email = 'Unknown'
    let created_at = subscription?.created_at || new Date().toISOString()
    let last_sign_in_at = subscription?.updated_at || new Date().toISOString()
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const authResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${params.id}`, {
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        })
        
        if (authResponse.ok) {
          const authUser = await authResponse.json()
          email = authUser.email || email
          created_at = authUser.created_at || created_at
          last_sign_in_at = authUser.last_sign_in_at || last_sign_in_at
        }
      } catch (error) {
        console.error('Failed to fetch auth user:', error)
      }
    }
    
    // Debug: Log what we received from Supabase
    console.log('Subscription data from Supabase:', JSON.stringify(subscription, null, 2))

    const userDetails = {
      id: params.id,
      email,
      created_at,
      last_sign_in_at,
      subscription_plan: subscription?.plan_id || subscription?.subscription_plan || 'free',
      subscription_status: subscription?.status || subscription?.subscription_status || 'inactive',
      billing_cycle: subscription?.billing_cycle,
      role: subscription?.role || 'user',
      posts_count: postsCount,
      drafts_count: draftsCount,
      connected_accounts: accountsCount,
      stripe_customer_id: subscription?.stripe_customer_id,
      trial_ends_at: subscription?.trial_end || subscription?.trial_ends_at,
      cancel_at: subscription?.cancel_at,
      canceled_at: subscription?.canceled_at,
      cancel_at_period_end: subscription?.cancel_at_period_end || false,
      is_suspended: subscription?.is_suspended || false,
      // Debug: Include raw value to see what Supabase returned
      _debug_raw_cancel_at_period_end: subscription?.cancel_at_period_end
    }
    
    return NextResponse.json(userDetails, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (error) {
    console.error('Simple user details API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch user details',
        details: error instanceof Error ? error.message : 'Unknown error',
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      },
      { status: 500 }
    )
  }
}