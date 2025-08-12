import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    }

    // Test Supabase connection with anon key
    let anonConnection = false
    let serviceConnection = false
    let authUser = null

    try {
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
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
      
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!error) {
        anonConnection = true
        authUser = user ? { id: user.id, email: user.email } : null
      }
    } catch (err) {
      console.error('Anon connection error:', err)
    }

    // Test service role connection
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseService = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      
      // Try a simple query
      const { error } = await supabaseService
        .from('user_subscriptions')
        .select('count')
        .limit(1)
        .single()
      
      if (!error) {
        serviceConnection = true
      }
    } catch (err) {
      console.error('Service connection error:', err)
    }

    // Check if user is admin
    let isAdmin = false
    let userRole = null
    
    if (authUser) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseService = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )
        
        const { data } = await supabaseService
          .from('user_subscriptions')
          .select('role')
          .eq('user_id', authUser.id)
          .single()
        
        if (data) {
          userRole = data.role
          isAdmin = data.role === 'admin' || data.role === 'super_admin'
        }
      } catch (err) {
        console.error('Role check error:', err)
      }
    }

    return NextResponse.json({
      status: 'debug',
      environment: envCheck,
      connections: {
        anonConnection,
        serviceConnection,
      },
      auth: {
        user: authUser,
        role: userRole,
        isAdmin,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Debug failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}