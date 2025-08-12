import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export type UserRole = 'user' | 'admin' | 'super_admin'

export interface AdminUser {
  id: string
  email: string
  role: UserRole
  created_at: string
  last_sign_in_at: string
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('user_subscriptions')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return data?.role === 'admin' || data?.role === 'super_admin'
}

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('user_subscriptions')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return data?.role === 'super_admin'
}

/**
 * Get current admin user details
 */
export async function getAdminUser(): Promise<AdminUser | null> {
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!subscription?.role || subscription.role === 'user') {
    return null
  }

  return {
    id: user.id,
    email: user.email!,
    role: subscription.role as UserRole,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at || user.created_at,
  }
}

/**
 * Middleware to protect admin API routes
 */
export async function requireAdmin(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!subscription?.role || subscription.role === 'user') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  return null // Continue with the request
}

/**
 * Middleware to protect super admin API routes
 */
export async function requireSuperAdmin(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (subscription?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
  }

  return null // Continue with the request
}

/**
 * Log admin action to audit log
 */
export async function logAdminAction(
  action: string,
  targetUserId?: string,
  targetResource?: string,
  details?: Record<string, any>,
  adminId?: string
) {
  try {
    // If adminId is not provided, try to get it from the current session
    let userId = adminId
    
    if (!userId) {
      const cookieStore = cookies()
      const supabaseAuth = createServerClient(
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

      const { data: { user } } = await supabaseAuth.auth.getUser()
      if (!user) {
        console.error('No user found for audit logging')
        return
      }
      userId = user.id
    }

    // Use the createClient directly instead of createServerClient for service role
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseService = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data, error } = await supabaseService.from('admin_audit_log').insert({
      admin_id: userId,
      action,
      target_user_id: targetUserId,
      target_resource: targetResource,
      details: details || {},
      created_at: new Date().toISOString()
    }).select()

    if (error) {
      console.error('Error logging admin action:', error)
      console.error('Failed to insert:', { userId, action, targetUserId, targetResource })
    } else {
      console.log('Successfully logged admin action:', action, data)
    }
  } catch (err) {
    console.error('Failed to log admin action:', err)
  }
}