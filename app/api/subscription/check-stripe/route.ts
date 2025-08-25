import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

export async function GET(request: NextRequest) {
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

    // Get user's subscription from database
    const { data: dbSub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!dbSub?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No subscription found' })
    }

    // Get the Stripe subscription
    const subscription = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id, {
      expand: ['items.data.price', 'latest_invoice']
    })

    // Get recent invoices
    const invoices = await stripe.invoices.list({
      subscription: dbSub.stripe_subscription_id,
      limit: 10
    })

    // Get payment intents for recent charges
    const charges = await stripe.charges.list({
      customer: dbSub.stripe_customer_id,
      limit: 5
    })

    return NextResponse.json({
      database: {
        plan_id: dbSub.plan_id,
        billing_cycle: dbSub.billing_cycle,
        status: dbSub.status,
        stripe_subscription_id: dbSub.stripe_subscription_id,
        current_period_end: dbSub.current_period_end
      },
      stripe_subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
        current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        items: subscription.items.data.map(item => ({
          price_id: item.price.id,
          amount: (item.price.unit_amount || 0) / 100,
          interval: item.price.recurring?.interval,
          product: (item.price.product as any)?.name || 'Unknown'
        })),
        latest_invoice: (subscription as any).latest_invoice?.id || null
      },
      recent_invoices: invoices.data.slice(0, 5).map(inv => ({
        id: inv.id,
        status: inv.status,
        amount_due: inv.amount_due / 100,
        amount_paid: inv.amount_paid / 100,
        created: new Date(inv.created * 1000).toISOString(),
        description: inv.description || 'Subscription',
        billing_reason: (inv as any).billing_reason
      })),
      recent_charges: charges.data.map(charge => ({
        id: charge.id,
        amount: charge.amount / 100,
        status: charge.status,
        created: new Date(charge.created * 1000).toISOString(),
        description: charge.description
      })),
      analysis: {
        db_matches_stripe: dbSub.plan_id === detectPlanFromPrice(subscription.items.data[0]?.price),
        multiple_items: subscription.items.data.length > 1,
        total_charged_recently: charges.data.reduce((sum, c) => sum + (c.amount / 100), 0)
      }
    })
  } catch (error: any) {
    console.error('Check Stripe error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function detectPlanFromPrice(price: any): string {
  if (!price) return 'unknown'
  const amount = price.unit_amount / 100
  const interval = price.recurring?.interval
  
  if (interval === 'month') {
    if (amount === 9) return 'starter'
    if (amount === 19) return 'professional'
    if (amount === 29) return 'enterprise'
  } else if (interval === 'year') {
    if (amount === 90) return 'starter'
    if (amount === 190) return 'professional'
    if (amount === 290) return 'enterprise'
  }
  
  return 'unknown'
}