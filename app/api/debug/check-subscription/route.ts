import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
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

    // Get user by email
    const { data: userData, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (userError) {
      // Try auth.users table
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (authError) {
        return NextResponse.json({ error: 'Failed to find user' }, { status: 404 })
      }
      
      const user = authUsers.users.find(u => u.email === email)
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Check subscription
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      return NextResponse.json({ 
        user_id: user.id,
        email: user.email,
        subscription: subscription || 'No subscription found',
        error: subError?.message
      })
    }

    // Check subscription using profile id
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userData.id)
      .single()

    return NextResponse.json({ 
      user_id: userData.id,
      subscription: subscription || 'No subscription found',
      error: subError?.message
    })

  } catch (error) {
    console.error('Check subscription error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}