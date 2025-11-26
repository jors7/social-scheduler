import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Define admin emails or fetch from database
const ADMIN_EMAILS = [
  'admin@socialcal.app',
  'jan.orsula1@gmail.com',
]

export async function checkIsAdmin() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }
  
  // Check if user is in admin list
  const isAdmin = ADMIN_EMAILS.includes(user.email || '')
  
  // Alternatively, check admin_users table
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single()
  
  if (!isAdmin && !adminUser) {
    redirect('/dashboard?error=unauthorized')
  }
  
  return { user, isAdmin: true }
}

export async function isUserAdmin(userId?: string) {
  if (!userId) return false

  const supabase = await createClient()

  // Check admin_users table first (more reliable)
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (adminUser) return true

  // Fallback: Get user email from auth and check against ADMIN_EMAILS
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email && ADMIN_EMAILS.includes(user.email)) {
    return true
  }

  return false
}

// Simple check for API routes - use when you already have user email
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email)
}

// Check admin by user ID using admin service client (for API routes)
export async function checkAdminByUserId(userId: string, supabaseAdmin: any): Promise<boolean> {
  const { data: adminUser } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .single()

  return !!adminUser
}