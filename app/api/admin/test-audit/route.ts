import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, logAdminAction } from '@/lib/admin/auth'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  // Check admin authorization
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    // Get current user to pass admin ID explicitly
    const { cookies } = await import('next/headers')
    const { createServerClient } = await import('@supabase/ssr')
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
    
    // Test logging an action with explicit admin ID
    await logAdminAction('test_audit_api', undefined, 'api_test', { 
      timestamp: new Date().toISOString(),
      test: true 
    }, user?.id)
    
    // Now fetch directly from database using service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Get all audit logs
    const { data: logs, error, count } = await supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Error fetching logs:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch audit logs',
        details: error 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      message: 'Test audit log created',
      total_logs: count,
      recent_logs: logs,
      test_successful: true
    })
  } catch (error) {
    console.error('Test audit API error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error },
      { status: 500 }
    )
  }
}