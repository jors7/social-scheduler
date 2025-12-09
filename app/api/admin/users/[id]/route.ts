import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'

// Create service role client for admin operations
function getServiceSupabase() {
  // Check if service role key exists
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
    return null
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin authorization
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    // Use service role for admin operations
    const supabase = getServiceSupabase()

    if (supabase) {
      // Get user details using service role
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(params.id)
      
      if (userError || !user) {
        console.error('User fetch error:', userError)
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Get subscription info
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', params.id)
        .single()

      // Get posts count
      const { count: postsCount } = await supabase
        .from('scheduled_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', params.id)

      // Get drafts count
      const { count: draftsCount } = await supabase
        .from('drafts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', params.id)

      // Get connected accounts count
      const { count: accountsCount } = await supabase
        .from('social_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', params.id)

      const userDetails = {
        id: user.user.id,
        email: user.user.email || '',
        created_at: user.user.created_at,
        last_sign_in_at: user.user.last_sign_in_at || user.user.created_at,
        subscription_plan: subscription?.plan_id || subscription?.subscription_plan || 'free',
        subscription_status: subscription?.status || subscription?.subscription_status || 'inactive',
        billing_cycle: subscription?.billing_cycle,
        role: subscription?.role || 'user',
        posts_count: postsCount || 0,
        drafts_count: draftsCount || 0,
        connected_accounts: accountsCount || 0,
        stripe_customer_id: subscription?.stripe_customer_id,
        trial_ends_at: subscription?.trial_end || subscription?.trial_ends_at,
        is_suspended: subscription?.is_suspended || false
      }

      return NextResponse.json(userDetails)
    } else {
      return NextResponse.json(
        { error: 'Service configuration error. SUPABASE_SERVICE_ROLE_KEY not available.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Admin user details API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin authorization
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const supabase = getServiceSupabase()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Service configuration error. Please add SUPABASE_SERVICE_ROLE_KEY to environment variables.' },
        { status: 500 }
      )
    }
    
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'update_role':
        const { error: roleError } = await supabase
          .from('user_subscriptions')
          .update({ role: data.role })
          .eq('user_id', params.id)

        if (roleError) {
          console.error('Role update error:', roleError)
          throw roleError
        }
        
        return NextResponse.json({ success: true, message: 'User role updated' })

      case 'suspend':
        const { error: suspendError } = await supabase
          .from('user_subscriptions')
          .update({ 
            is_suspended: true,
            subscription_status: 'suspended'
          })
          .eq('user_id', params.id)

        if (suspendError) {
          console.error('Suspend error:', suspendError)
          throw suspendError
        }
        
        return NextResponse.json({ success: true, message: 'User suspended' })

      case 'activate':
        const { error: activateError } = await supabase
          .from('user_subscriptions')
          .update({ 
            is_suspended: false,
            subscription_status: 'active'
          })
          .eq('user_id', params.id)

        if (activateError) {
          console.error('Activate error:', activateError)
          throw activateError
        }
        
        return NextResponse.json({ success: true, message: 'User activated' })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Admin user update API error:', error)
    return NextResponse.json(
      { error: 'Failed to update user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}