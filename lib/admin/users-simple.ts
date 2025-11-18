import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// Create a service role client for admin operations
function getServiceSupabase() {
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

export interface UserListItem {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string
  plan_id: string
  subscription_status: string
  billing_cycle?: string
  role: string
  posts_count?: number
}

/**
 * Get list of all users with pagination - simplified version
 */
export async function getUsersSimple(
  page: number = 1,
  limit: number = 20,
  search?: string,
  roleFilter?: string,
  planFilter?: string,
  statusFilter?: string,
  billingFilter?: string
) {
  try {
    // Use service role client
    const supabase = getServiceSupabase()
    
    const offset = (page - 1) * limit

    // Build the query for subscriptions
    let query = supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact' })

    // Apply filters
    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter)
    }
    if (planFilter && planFilter !== 'all') {
      query = query.eq('plan_id', planFilter)
    }
    if (statusFilter && statusFilter !== 'all') {
      // Handle status filter
      if (statusFilter === 'suspended') {
        query = query.eq('is_suspended', true)
      } else if (statusFilter === 'inactive') {
        query = query.or('subscription_status.is.null,subscription_status.eq.inactive')
      } else {
        query = query.eq('subscription_status', statusFilter)
      }
    }
    if (billingFilter && billingFilter !== 'all') {
      // Handle both 'annual' and 'yearly' for compatibility
      if (billingFilter === 'annual') {
        query = query.or('billing_cycle.eq.annual,billing_cycle.eq.yearly')
      } else {
        query = query.eq('billing_cycle', billingFilter)
      }
    }

    // Get paginated results
    const { data: subscriptions, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscriptions:', error)
      console.error('Query details:', {
        roleFilter,
        planFilter, 
        statusFilter,
        page,
        limit
      })
      throw error
    }

    // Get auth users separately
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 1000 // Get more to ensure we have all we need
    })

    if (authError) {
      console.error('Error fetching auth users:', authError)
    }

    // Combine the data
    const users: UserListItem[] = []

    // Fix N+1 query: Get ALL post counts in ONE query instead of looping
    const userIds = (subscriptions || []).map(s => s.user_id)
    const { data: allPosts } = await supabase
      .from('scheduled_posts')
      .select('user_id')
      .in('user_id', userIds)

    // Count posts per user in memory
    const postCountMap = (allPosts || []).reduce((acc, post) => {
      acc[post.user_id] = (acc[post.user_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    for (const sub of subscriptions || []) {
      // Find matching auth user
      const authUser = authUsers?.find(u => u.id === sub.user_id)

      if (authUser) {
        users.push({
          id: sub.user_id,
          email: authUser.email || 'Unknown',
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at || authUser.created_at,
          plan_id: sub.plan_id || 'free',
          subscription_status: sub.is_suspended ? 'suspended' : (sub.status || 'inactive'),
          billing_cycle: sub.billing_cycle || 'monthly',
          role: sub.role || 'user',
          posts_count: postCountMap[sub.user_id] || 0
        })
      } else {
        // User exists in subscriptions but not in auth (shouldn't happen, but handle it)
        users.push({
          id: sub.user_id,
          email: 'Unknown User',
          created_at: sub.created_at,
          last_sign_in_at: sub.updated_at || sub.created_at,
          plan_id: sub.plan_id || 'free',
          subscription_status: sub.is_suspended ? 'suspended' : (sub.status || 'inactive'),
          billing_cycle: sub.billing_cycle || 'monthly',
          role: sub.role || 'user',
          posts_count: 0
        })
      }
    }

    // Apply search filter on email if provided
    let filteredUsers = users
    if (search) {
      filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    }

    return {
      users: filteredUsers,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  } catch (error) {
    console.error('getUsersSimple error:', error)
    throw error
  }
}

/**
 * Get admin stats - simplified version
 */
export async function getAdminStatsSimple() {
  try {
    const supabase = getServiceSupabase()
    
    // Get counts from various tables
    const { count: totalUsers } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })

    const { count: paidUsers } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active')
      .neq('plan_id', 'free')

    const { count: totalPosts } = await supabase
      .from('scheduled_posts')
      .select('*', { count: 'exact', head: true })

    // Get posts today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: postsToday } = await supabase
      .from('scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    // Get revenue this month
    const firstDayOfMonth = new Date()
    firstDayOfMonth.setDate(1)
    firstDayOfMonth.setHours(0, 0, 0, 0)
    
    const { data: payments } = await supabase
      .from('payment_history')
      .select('amount')
      .eq('status', 'succeeded')
      .gte('created_at', firstDayOfMonth.toISOString())

    const revenueMonth = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    return {
      total_users: totalUsers || 0,
      active_users: totalUsers || 0, // Simplified
      paid_users: paidUsers || 0,
      total_posts: totalPosts || 0,
      posts_today: postsToday || 0,
      revenue_month: revenueMonth / 100 // Convert from cents
    }
  } catch (error) {
    console.error('getAdminStatsSimple error:', error)
    // Return default values on error
    return {
      total_users: 0,
      active_users: 0,
      paid_users: 0,
      total_posts: 0,
      posts_today: 0,
      revenue_month: 0
    }
  }
}

/**
 * Get user details - simplified version
 */
/**
 * Update user role
 */
export async function updateUserRole(userId: string, newRole: string) {
  try {
    const supabase = getServiceSupabase()
    
    // Update the role in user_subscriptions table
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating user role:', error)
      throw error
    }
    
    return data
  } catch (error) {
    console.error('updateUserRole error:', error)
    throw error
  }
}

/**
 * Update user status (suspend/activate)
 */
export async function updateUserStatus(userId: string, suspended: boolean, adminId?: string) {
  try {
    const supabase = getServiceSupabase()
    
    // Update the user's ban status in auth.users
    const { error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { ban_duration: suspended ? '876600h' : 'none' } // 100 years or none
    )
    
    if (authError) {
      console.error('Error updating user auth status:', authError)
      throw authError
    }
    
    // Update suspension tracking in user_subscriptions
    const updateData: any = {
      is_suspended: suspended,
      updated_at: new Date().toISOString()
    }
    
    if (suspended) {
      updateData.suspended_at = new Date().toISOString()
      if (adminId) {
        updateData.suspended_by = adminId
      }
    } else {
      updateData.suspended_at = null
      updateData.suspended_by = null
    }
    
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', userId)
    
    if (subError) {
      console.error('Error updating suspension status:', subError)
      // Don't throw here, auth update was successful
    }
    
    return { success: true }
  } catch (error) {
    console.error('updateUserStatus error:', error)
    throw error
  }
}

export async function getUserDetailsSimple(userId: string) {
  try {
    const supabase = getServiceSupabase()
    
    // Get user subscription
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!subscription) return null

    // Get auth user
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
    
    if (!authUser) return null

    // Get counts
    const { count: postCount } = await supabase
      .from('scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { count: draftCount } = await supabase
      .from('drafts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { count: accountCount } = await supabase
      .from('social_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    return {
      id: userId,
      email: authUser.email || 'Unknown',
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at || authUser.created_at,
      subscription_plan: subscription.plan_id || 'free',
      subscription_status: subscription.is_suspended ? 'suspended' : (subscription.subscription_status || 'inactive'),
      billing_cycle: subscription.billing_cycle || 'monthly',
      role: subscription.role || 'user',
      is_suspended: subscription.is_suspended || false,
      suspended_at: subscription.suspended_at,
      posts_count: postCount || 0,
      drafts_count: draftCount || 0,
      connected_accounts: accountCount || 0,
      stripe_customer_id: subscription.stripe_customer_id,
      trial_ends_at: subscription.trial_ends_at
    }
  } catch (error) {
    console.error('getUserDetailsSimple error:', error)
    return null
  }
}