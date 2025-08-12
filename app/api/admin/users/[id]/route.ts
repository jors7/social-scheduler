import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireSuperAdmin, logAdminAction } from '@/lib/admin/auth'
import { getUserDetailsSimple, updateUserRole, updateUserStatus } from '@/lib/admin/users-simple'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin authorization
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const userDetails = await getUserDetailsSimple(params.id)
    
    if (!userDetails) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Log the action
    await logAdminAction('view_user_details', params.id)

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
  // Check admin authorization
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'update_role':
        // Only super admins can change roles
        const superAdminError = await requireSuperAdmin(request)
        if (superAdminError) return superAdminError

        // Prevent changing your own role
        const { cookies } = await import('next/headers')
        const { createServerClient } = await import('@supabase/ssr')
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
        if (user && user.id === params.id) {
          return NextResponse.json(
            { error: 'You cannot change your own role' },
            { status: 403 }
          )
        }

        await updateUserRole(params.id, data.role)
        await logAdminAction('update_user_role', params.id, undefined, { new_role: data.role })
        
        return NextResponse.json({ success: true, message: 'User role updated' })

      case 'suspend':
        // Check if target user is an admin or super_admin
        const { getUserDetailsSimple } = await import('@/lib/admin/users-simple')
        const targetUser = await getUserDetailsSimple(params.id)
        
        if (targetUser && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
          // Only super_admins can suspend other admins
          const suspendAdminError = await requireSuperAdmin(request)
          if (suspendAdminError) {
            return NextResponse.json(
              { error: 'Only super admins can suspend other administrators' },
              { status: 403 }
            )
          }
          
          // Prevent suspending yourself
          const { cookies } = await import('next/headers')
          const { createServerClient } = await import('@supabase/ssr')
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
          if (user && user.id === params.id) {
            return NextResponse.json(
              { error: 'You cannot suspend yourself' },
              { status: 403 }
            )
          }
        }
        
        await updateUserStatus(params.id, true)
        await logAdminAction('suspend_user', params.id)
        
        return NextResponse.json({ success: true, message: 'User suspended' })

      case 'activate':
        await updateUserStatus(params.id, false)
        await logAdminAction('activate_user', params.id)
        
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