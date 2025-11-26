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

export interface AuditLogEntry {
  id: string
  admin_id: string
  admin_email?: string
  action: string
  target_user_id?: string
  target_resource?: string
  details?: any
  created_at: string
}

/**
 * Get audit logs with pagination and filters
 */
export async function getAuditLogs(
  page: number = 1,
  limit: number = 50,
  search?: string,
  actionFilter?: string,
  dateFilter?: string
) {
  try {
    const supabase = getServiceSupabase()
    const offset = (page - 1) * limit
    
    // Build the query
    let query = supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
    
    // Apply filters
    if (actionFilter && actionFilter !== 'all') {
      query = query.eq('action', actionFilter)
    }
    
    // Apply date filter
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date()
      let startDate: Date
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          startDate = new Date(0)
      }
      
      query = query.gte('created_at', startDate.toISOString())
    }
    
    // Get paginated results
    const { data: logs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching audit logs:', error)
      throw error
    }
    
    console.log('Raw audit logs fetched:', logs?.length || 0, 'Total count:', count)
    
    // Get admin emails for the logs
    const adminIds = Array.from(new Set(logs?.map(log => log.admin_id) || []))
    const adminEmails: Record<string, string> = {}
    
    if (adminIds.length > 0) {
      // Get auth users - need to fetch them one by one
      for (const adminId of adminIds) {
        try {
          const { data: { user } } = await supabase.auth.admin.getUserById(adminId)
          if (user) {
            adminEmails[adminId] = user.email || 'Unknown'
          }
        } catch (err) {
          console.error(`Error fetching admin user ${adminId}:`, err)
          adminEmails[adminId] = 'Unknown'
        }
      }
    }
    
    console.log('Fetched logs:', logs?.length || 0, 'Admin emails:', adminEmails)
    
    // Combine logs with admin emails
    const enrichedLogs: AuditLogEntry[] = (logs || []).map(log => ({
      ...log,
      admin_email: adminEmails[log.admin_id] || 'Unknown'
    }))
    
    // Apply search filter if provided (search by email or action)
    let filteredLogs = enrichedLogs
    if (search) {
      filteredLogs = enrichedLogs.filter(log => 
        log.admin_email?.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.target_user_id?.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    return {
      logs: filteredLogs,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  } catch (error) {
    console.error('getAuditLogs error:', error)
    throw error
  }
}

// Common admin actions for affiliate system
export const ADMIN_ACTIONS = {
  AFFILIATE_APPROVED: 'affiliate_approved',
  AFFILIATE_REJECTED: 'affiliate_rejected',
  AFFILIATE_SUSPENDED: 'affiliate_suspended',
  AFFILIATE_REACTIVATED: 'affiliate_reactivated',
  PAYOUT_PROCESSED: 'payout_processed',
  PAYOUT_CANCELLED: 'payout_cancelled',
} as const;

/**
 * Log an admin action for audit trail
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetResourceType: string,
  targetResourceId?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const supabase = getServiceSupabase();

    await supabase.from('admin_audit_log').insert({
      admin_id: adminId,
      action: action,
      target_resource: targetResourceType,
      target_user_id: targetResourceId,
      details: details,
    });
  } catch (error) {
    // Log but don't fail the request if audit logging fails
    console.error('Failed to log admin action:', error);
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditStats() {
  try {
    const supabase = getServiceSupabase()
    
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Get today's action count
    const { count: todayCount } = await supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
    
    // Get active admins today (unique admin_ids)
    const { data: todayAdmins } = await supabase
      .from('admin_audit_log')
      .select('admin_id')
      .gte('created_at', todayStart.toISOString())
    
    const uniqueAdmins = new Set(todayAdmins?.map(a => a.admin_id) || [])
    
    // Get critical actions count (suspensions, role changes)
    const { count: criticalCount } = await supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .in('action', ['suspend_user', 'update_user_role', 'activate_user'])
      .gte('created_at', todayStart.toISOString())
    
    return {
      todayActions: todayCount || 0,
      activeAdmins: uniqueAdmins.size,
      criticalActions: criticalCount || 0
    }
  } catch (error) {
    console.error('getAuditStats error:', error)
    return {
      todayActions: 0,
      activeAdmins: 0,
      criticalActions: 0
    }
  }
}