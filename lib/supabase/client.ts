import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../supabase'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('Supabase Config Debug:', {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
    key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING'
  })
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables!')
    throw new Error('Missing Supabase configuration')
  }
  
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}