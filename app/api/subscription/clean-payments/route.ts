import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

export async function POST(request: NextRequest) {
  try {
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Cleaning payment history for user:', user.id)

    // Get all $0 payments for this user
    const { data: zeroPayments, error: fetchError } = await supabaseAdmin
      .from('payment_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('amount', 0)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching payments:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    console.log(`Found ${zeroPayments?.length || 0} zero-amount payments`)

    // Group by date to find duplicates
    const paymentsByDate: { [key: string]: any[] } = {}
    
    zeroPayments?.forEach(payment => {
      const date = payment.created_at.split('T')[0] // Get just the date part
      if (!paymentsByDate[date]) {
        paymentsByDate[date] = []
      }
      paymentsByDate[date].push(payment)
    })

    // Find and delete duplicates (keep only the first one per day)
    const toDelete: string[] = []
    
    Object.entries(paymentsByDate).forEach(([date, payments]) => {
      if (payments.length > 1) {
        // Keep the first, delete the rest
        console.log(`Found ${payments.length} payments on ${date}, keeping 1`)
        payments.slice(1).forEach(payment => {
          toDelete.push(payment.id)
        })
      }
    })

    // Also delete any $0 payments that aren't subscription creation
    zeroPayments?.forEach(payment => {
      const metadata = payment.metadata || {}
      const description = payment.description || ''
      
      // Keep only significant $0 payments
      const isSignificant = 
        description.includes('trial') ||
        description.includes('Trial') ||
        metadata.type === 'trial_started' ||
        metadata.billing_reason === 'subscription_create'
      
      if (!isSignificant && !toDelete.includes(payment.id)) {
        toDelete.push(payment.id)
      }
    })

    console.log(`Deleting ${toDelete.length} duplicate/unnecessary payments`)

    if (toDelete.length > 0) {
      // Delete the duplicates
      const { error: deleteError } = await supabaseAdmin
        .from('payment_history')
        .delete()
        .in('id', toDelete)

      if (deleteError) {
        console.error('Error deleting duplicates:', deleteError)
        return NextResponse.json({ error: 'Failed to delete duplicates' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${toDelete.length} duplicate/unnecessary payment records`,
      deleted: toDelete.length,
      remaining: (zeroPayments?.length || 0) - toDelete.length
    })

  } catch (error: any) {
    console.error('Clean payments error:', error)
    return NextResponse.json(
      { error: 'Failed to clean payment history', details: error.message },
      { status: 500 }
    )
  }
}