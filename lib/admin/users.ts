import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface UserDetails {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string
  subscription_plan: string
  subscription_status: string
  role: string
  posts_count: number
  drafts_count: number
  connected_accounts: number
  stripe_customer_id?: string
  trial_ends_at?: string
}

export interface UserListItem {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string
  plan_id: string
  subscription_status: string
  role: string
  posts_count?: number
}

export interface AdminStats {
  total_users: number
  active_users: number
  paid_users: number
  total_posts: number
  posts_today: number
  revenue_month: number
}

/**
 * Get list of all users with pagination and filters
 */
export async function getUsers(
  page: number = 1,
  limit: number = 20,
  search?: string,
  roleFilter?: string,
  planFilter?: string,
  statusFilter?: string
) {
  const cookieStore = cookies()
  // Use service role for admin operations
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const offset = (page - 1) * limit

  // Build the query
  let query = supabase
    .from('user_subscriptions')
    .select(`
      user_id,
      plan_id,
      subscription_status,
      role,
      created_at,
      updated_at
    `)

  // Apply filters
  if (roleFilter && roleFilter !== 'all') {
    query = query.eq('role', roleFilter)
  }
  if (planFilter && planFilter !== 'all') {
    query = query.eq('plan_id', planFilter)
  }
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('subscription_status', statusFilter)
  }

  // Get paginated results
  const { data: subscriptions, error, count } = await query
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get user details from auth.users
  const userIds = subscriptions?.map(s => s.user_id) || []
  
  // Get user emails (requires service role)
  const users: UserListItem[] = []
  
  for (const sub of subscriptions || []) {
    const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id)
    
    if (authUser?.user) {
      // Get post count for each user
      const { count: postCount } = await supabase
        .from('scheduled_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', sub.user_id)

      users.push({
        id: sub.user_id,
        email: authUser.user.email || 'Unknown',
        created_at: authUser.user.created_at,
        last_sign_in_at: authUser.user.last_sign_in_at || authUser.user.created_at,
        plan_id: sub.plan_id || 'free',
        subscription_status: sub.subscription_status || 'inactive',
        role: sub.role || 'user',
        posts_count: postCount || 0
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
}

/**
 * Get detailed information about a specific user
 */
export async function getUserDetails(userId: string): Promise<UserDetails | null> {
  const cookieStore = cookies()
  // Use service role for admin operations
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  // Get auth user data
  const { data: authUser } = await supabase.auth.admin.getUserById(userId)
  if (!authUser?.user) return null

  // Get subscription data
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Get post count
  const { count: postCount } = await supabase
    .from('scheduled_posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Get draft count
  const { count: draftCount } = await supabase
    .from('drafts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Get connected accounts count
  const { count: accountCount } = await supabase
    .from('social_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  return {
    id: userId,
    email: authUser.user.email || 'Unknown',
    created_at: authUser.user.created_at,
    last_sign_in_at: authUser.user.last_sign_in_at || authUser.user.created_at,
    subscription_plan: subscription?.plan_id || 'free',
    subscription_status: subscription?.subscription_status || 'inactive',
    role: subscription?.role || 'user',
    posts_count: postCount || 0,
    drafts_count: draftCount || 0,
    connected_accounts: accountCount || 0,
    stripe_customer_id: subscription?.stripe_customer_id,
    trial_ends_at: subscription?.trial_ends_at
  }
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  const cookieStore = cookies()
  // Regular client for most queries
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

  // Get total users count
  const { count: totalUsers } = await supabase
    .from('user_subscriptions')
    .select('*', { count: 'exact', head: true })

  // Get active users (last 30 days) - requires checking auth.users
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  // Get paid users count
  const { count: paidUsers } = await supabase
    .from('user_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'active')
    .neq('plan_id', 'free')

  // Get total posts count
  const { count: totalPosts } = await supabase
    .from('scheduled_posts')
    .select('*', { count: 'exact', head: true })

  // Get posts today count
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
    active_users: totalUsers || 0, // Simplified for now
    paid_users: paidUsers || 0,
    total_posts: totalPosts || 0,
    posts_today: postsToday || 0,
    revenue_month: revenueMonth / 100 // Convert from cents
  }
}

/**
 * Update user role (super admin only)
 */
export async function updateUserRole(userId: string, newRole: string) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) throw error
  return data
}

/**
 * Suspend or activate a user account
 */
export async function updateUserStatus(userId: string, suspend: boolean) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  // Update user's banned status
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { ban_duration: suspend ? '876000h' : 'none' } // 100 years or remove ban
  )

  if (error) throw error
  return data
}