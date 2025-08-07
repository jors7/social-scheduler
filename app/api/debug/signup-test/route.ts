import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    // Create admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Try to create user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User'
      }
    })

    if (error) {
      console.error('Signup error:', error)
      return NextResponse.json({ 
        error: error.message,
        details: error
      }, { status: 400 })
    }

    // Check if subscription was created
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', data.user?.id)
      .single()

    return NextResponse.json({ 
      success: true,
      user: data.user?.email,
      userId: data.user?.id,
      subscription: subscription || 'No subscription created',
      subscriptionError: subError?.message
    })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}