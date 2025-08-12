import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getUserDetailsSimple, updateUserRole, updateUserStatus } from '@/lib/admin/users-simple'

async function getAuthUser() {
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

  const { data } = await supabase
    .from('user_subscriptions')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return { ...user, role: data?.role || 'user' }
}

async function logAction(action: string, targetUserId: string, details?: any) {
  try {
    const user = await getAuthUser()
    if (!user) return

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: user.id,
        action,
        target_user_id: targetUserId,
        details
      })
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authorization
    const user = await getAuthUser()
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userDetails = await getUserDetailsSimple(params.id)
    
    if (!userDetails) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Log the action
    await logAction('view_user_details', params.id)

    return NextResponse.json(userDetails)
  } catch (error) {
    console.error('Admin user details API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authorization
    const user = await getAuthUser()
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'update_role':
        // Only super admins can change roles
        if (user.role !== 'super_admin') {
          return NextResponse.json(
            { error: 'Only super admins can change roles' },
            { status: 403 }
          )
        }

        // Prevent changing your own role
        if (user.id === params.id) {
          return NextResponse.json(
            { error: 'You cannot change your own role' },
            { status: 403 }
          )
        }

        await updateUserRole(params.id, data.role)
        await logAction('update_user_role', params.id, { new_role: data.role })
        
        return NextResponse.json({ success: true, message: 'User role updated' })

      case 'suspend':
        // Check if target user is an admin or super_admin
        const targetUser = await getUserDetailsSimple(params.id)
        
        if (targetUser && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
          // Only super_admins can suspend other admins
          if (user.role !== 'super_admin') {
            return NextResponse.json(
              { error: 'Only super admins can suspend other administrators' },
              { status: 403 }
            )
          }
          
          // Prevent suspending yourself
          if (user.id === params.id) {
            return NextResponse.json(
              { error: 'You cannot suspend yourself' },
              { status: 403 }
            )
          }
        }
        
        await updateUserStatus(params.id, true)
        await logAction('suspend_user', params.id)
        
        return NextResponse.json({ success: true, message: 'User suspended' })

      case 'activate':
        await updateUserStatus(params.id, false)
        await logAction('activate_user', params.id)
        
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
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}