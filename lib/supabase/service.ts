import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with service role privileges
 *
 * This client bypasses Row Level Security (RLS) policies and should only
 * be used in secure server-side contexts like API routes and webhooks.
 *
 * NEVER expose this client to the browser or use it in client components.
 *
 * Common use cases:
 * - Webhook handlers that need to modify data regardless of user context
 * - Background jobs and cron tasks
 * - Admin operations
 * - Public API endpoints that track anonymous user actions (e.g., affiliate clicks)
 */
export const createServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
