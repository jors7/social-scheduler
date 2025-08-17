import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Define admin emails or fetch from database
const ADMIN_EMAILS = [
  'admin@socialcal.app',
  // Add more admin emails here
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
  
  // Get user details
  const { data: userData } = await supabase
    .from('auth.users')
    .select('email')
    .eq('id', userId)
    .single()
  
  if (userData && ADMIN_EMAILS.includes(userData.email)) {
    return true
  }
  
  // Check admin_users table
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .single()
  
  return !!adminUser
}