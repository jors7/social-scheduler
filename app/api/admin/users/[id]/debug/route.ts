import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check environment variables
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const serviceRoleLength = process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    
    // Try to create the client
    let clientCreated = false
    let authTestResult = null
    
    try {
      const { createClient } = await import('@supabase/supabase-js')
      
      if (hasServiceRole && hasSupabaseUrl) {
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
        clientCreated = true
        
        // Try to fetch the user
        const { data, error } = await supabase.auth.admin.getUserById(params.id)
        authTestResult = {
          success: !error,
          error: error?.message,
          hasData: !!data
        }
      }
    } catch (error) {
      authTestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    return NextResponse.json({
      userId: params.id,
      environment: {
        hasServiceRole,
        serviceRoleLength,
        serviceRolePrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20),
        hasSupabaseUrl,
        nodeEnv: process.env.NODE_ENV
      },
      client: {
        created: clientCreated,
        authTest: authTestResult
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}