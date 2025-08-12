import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 30)
    },
    tests: {}
  }

  // Test 1: Can we make a basic REST call with anon key?
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
      },
    })
    results.tests.anonKeyRest = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText
    }
  } catch (error) {
    results.tests.anonKeyRest = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Test 2: Can we make a REST call with service key?
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_subscriptions?limit=1`, {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      })
      const data = await response.json()
      results.tests.serviceKeyRest = {
        success: response.ok,
        status: response.status,
        recordsFound: Array.isArray(data) ? data.length : 0
      }
    } catch (error) {
      results.tests.serviceKeyRest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  } else {
    results.tests.serviceKeyRest = {
      success: false,
      error: 'Service key not found in environment'
    }
  }

  // Test 3: Can we use the Supabase client?
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .limit(1)
      
      results.tests.supabaseClient = {
        success: !error,
        hasData: !!data,
        recordCount: data?.length || 0,
        error: error?.message
      }
    } else {
      results.tests.supabaseClient = {
        success: false,
        error: 'Service key not available'
      }
    }
  } catch (error) {
    results.tests.supabaseClient = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Test 4: Check a specific user
  const testUserId = '34da8335-3c9d-44b8-a13f-b7aff8e3b3d7'
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${testUserId}`,
        {
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      )
      const data = await response.json()
      results.tests.specificUser = {
        success: response.ok,
        status: response.status,
        found: Array.isArray(data) && data.length > 0,
        userData: data[0] ? { 
          plan: data[0].subscription_plan,
          status: data[0].subscription_status 
        } : null
      }
    } catch (error) {
      results.tests.specificUser = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  })
}