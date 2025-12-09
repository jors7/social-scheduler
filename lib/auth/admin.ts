/**
 * @deprecated Use `lib/admin/auth.ts` instead for API routes.
 *
 * This file is kept for backward compatibility but the preferred approach is:
 * - API routes: Use `requireAdmin()` or `requireSuperAdmin()` from `lib/admin/auth.ts`
 * - Database RLS: Uses `admin_users` table directly
 * - Client components: Query `admin_users` table directly
 *
 * The `admin_users` table is the source of truth for database-level access.
 * The `user_subscriptions.role` column is used for application-level admin checks.
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Define admin emails (fallback for legacy code)
const ADMIN_EMAILS = [
  'admin@socialcal.app',
  'jan.orsula1@gmail.com',
]

/**
 * @deprecated Use middleware protection or `requireAdmin()` from `lib/admin/auth.ts` instead.
 * Check if current user is admin and redirect if not.
 */
export async function checkIsAdmin() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Check admin_users table (primary source)
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Fallback: check hardcoded email list
  const isAdminEmail = ADMIN_EMAILS.includes(user.email || '')

  if (!adminUser && !isAdminEmail) {
    redirect('/dashboard?error=unauthorized')
  }

  return { user, isAdmin: true }
}

/**
 * Check if a user ID belongs to an admin.
 * Uses admin_users table as primary source.
 */
export async function isUserAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false

  const supabase = await createClient()

  // Check admin_users table (primary source for RLS compatibility)
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (adminUser) return true

  // Fallback: check user_subscriptions.role (for API route compatibility)
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (subscription?.role === 'admin' || subscription?.role === 'super_admin') {
    return true
  }

  // Final fallback: check email
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email && ADMIN_EMAILS.includes(user.email)) {
    return true
  }

  return false
}

/**
 * Simple check for API routes when you already have user email.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email)
}

/**
 * Check admin by user ID using a service client (for API routes).
 * @deprecated Use `requireAdmin()` from `lib/admin/auth.ts` instead.
 */
export async function checkAdminByUserId(userId: string, supabaseAdmin: any): Promise<boolean> {
  // Check admin_users table first
  const { data: adminUser } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (adminUser) return true

  // Fallback: check user_subscriptions.role
  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('role')
    .eq('user_id', userId)
    .single()

  return subscription?.role === 'admin' || subscription?.role === 'super_admin'
}
