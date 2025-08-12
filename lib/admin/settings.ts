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

export interface AdminSetting {
  id: string
  setting_key: string
  setting_value: any
  setting_type: string
  description?: string
  updated_by?: string
  updated_at: string
}

/**
 * Get all admin settings
 */
export async function getAdminSettings() {
  try {
    const supabase = getServiceSupabase()
    
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .order('setting_type', { ascending: true })
      .order('setting_key', { ascending: true })
    
    if (error) {
      console.error('Error fetching admin settings:', error)
      throw error
    }
    
    // Convert to a more usable format
    const settings: Record<string, any> = {}
    for (const setting of data || []) {
      settings[setting.setting_key] = setting.setting_value
    }
    
    return settings
  } catch (error) {
    console.error('getAdminSettings error:', error)
    throw error
  }
}

/**
 * Update a single admin setting
 */
export async function updateAdminSetting(
  key: string, 
  value: any,
  adminId: string
) {
  try {
    const supabase = getServiceSupabase()
    
    const { data, error } = await supabase
      .from('admin_settings')
      .update({
        setting_value: value,
        updated_by: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', key)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating admin setting:', error)
      throw error
    }
    
    return data
  } catch (error) {
    console.error('updateAdminSetting error:', error)
    throw error
  }
}

/**
 * Update multiple admin settings at once
 */
export async function updateAdminSettings(
  settings: Record<string, any>,
  adminId: string
) {
  try {
    const supabase = getServiceSupabase()
    
    // Update each setting
    const updates = []
    for (const [key, value] of Object.entries(settings)) {
      updates.push(
        supabase
          .from('admin_settings')
          .update({
            setting_value: value,
            updated_by: adminId,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', key)
      )
    }
    
    // Execute all updates
    await Promise.all(updates)
    
    return { success: true }
  } catch (error) {
    console.error('updateAdminSettings error:', error)
    throw error
  }
}