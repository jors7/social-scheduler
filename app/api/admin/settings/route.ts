import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireSuperAdmin, logAdminAction } from '@/lib/admin/auth'
import { getAdminSettings, updateAdminSetting, updateAdminSettings } from '@/lib/admin/settings'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  // Check admin authorization
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const settings = await getAdminSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Admin settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  // Only super admins can update settings
  const authError = await requireSuperAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { key, value, settings } = body
    
    // Get current admin ID
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
    
    // Update single setting or multiple settings
    if (key && value !== undefined) {
      // Single setting update
      await updateAdminSetting(key, value, user.id)
      await logAdminAction('update_admin_setting', undefined, key, { value })
    } else if (settings) {
      // Multiple settings update
      await updateAdminSettings(settings, user.id)
      await logAdminAction('update_admin_settings', undefined, 'multiple', { 
        keys: Object.keys(settings) 
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin settings PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}