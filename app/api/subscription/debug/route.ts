import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    // Get the current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get subscription from database
    const { data: dbSubscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Check if subscription exists in Stripe
    let stripeSubscription = null
    let stripeError = null
    
    if (dbSubscription?.stripe_subscription_id) {
      try {
        if (dbSubscription.stripe_subscription_id.startsWith('manual_')) {
          stripeError = 'Manual subscription (not in Stripe)'
        } else {
          stripeSubscription = await stripe.subscriptions.retrieve(
            dbSubscription.stripe_subscription_id
          )
        }
      } catch (err: any) {
        stripeError = err.message
      }
    }

    // Get payment history
    const { data: payments } = await supabaseAdmin
      .from('payment_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      database: {
        exists: !!dbSubscription,
        subscription: dbSubscription,
        error: subError?.message
      },
      stripe: {
        exists: !!stripeSubscription,
        subscription: stripeSubscription ? {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          items: stripeSubscription.items.data.map(item => ({
            price_id: item.price.id,
            product: item.price.product
          }))
        } : null,
        error: stripeError
      },
      payments: payments || [],
      webhookSecrets: {
        hasProduction: !!process.env.STRIPE_WEBHOOK_SECRET,
        hasLocal: !!process.env.STRIPE_WEBHOOK_SECRET_LOCAL,
        areDifferent: process.env.STRIPE_WEBHOOK_SECRET !== process.env.STRIPE_WEBHOOK_SECRET_LOCAL
      },
      recommendation: dbSubscription?.stripe_subscription_id?.startsWith('manual_') 
        ? 'You have a manual subscription. To change plans, you need to set up a real Stripe subscription first.'
        : !stripeSubscription && dbSubscription
        ? 'Database subscription exists but not found in Stripe. Use the sync button or create a new subscription.'
        : stripeSubscription && dbSubscription
        ? 'Subscription is properly set up. You should be able to change plans.'
        : 'No subscription found. Please purchase a plan.'
    })
    
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error?.message 
    }, { status: 500 })
  }
}