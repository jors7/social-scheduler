import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

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

    // Get database subscription
    const { data: dbSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!dbSub?.stripe_subscription_id) {
      return NextResponse.json({ 
        error: 'No subscription found',
        database: null 
      })
    }

    // Get Stripe subscription with expanded data
    const subscription = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id, {
      expand: ['items.data.price', 'customer', 'latest_invoice']
    })

    const currentItem = (subscription as any).items.data[0]
    const currentPrice = currentItem?.price
    const priceId = currentPrice?.id

    // Known price mappings
    const PRICE_MAPPINGS: Record<string, { plan: string, cycle: string }> = {
      'price_1RtUNnA6BBN8qFjBGLuo3qFM': { plan: 'starter', cycle: 'monthly' },
      'price_1RtUNSA6BBN8qFjBoeFyL3NS': { plan: 'starter', cycle: 'yearly' },
      'price_1RtUOEA6BBN8qFjB0HtMVjLr': { plan: 'professional', cycle: 'monthly' },
      'price_1RtUOTA6BBN8qFjBrXkY1ExC': { plan: 'professional', cycle: 'yearly' },
      'price_1RtUP4A6BBN8qFjBI2hBmwcT': { plan: 'enterprise', cycle: 'monthly' },
      'price_1RtUPFA6BBN8qFjByzefry7H': { plan: 'enterprise', cycle: 'yearly' },
      // Dynamically created prices
      'price_1RzxEiA6BBN8qFjBnq7oVQYu': { plan: 'enterprise', cycle: 'monthly' },
      'price_1RzxMlA6BBN8qFjBC1uVrD7K': { plan: 'enterprise', cycle: 'yearly' },
      'price_1S02IuA6BBN8qFjBVzAzPdtR': { plan: 'enterprise', cycle: 'yearly' },
    }

    let detectedPlan = 'unknown'
    let detectedCycle = 'unknown'
    
    if (PRICE_MAPPINGS[priceId]) {
      detectedPlan = PRICE_MAPPINGS[priceId].plan
      detectedCycle = PRICE_MAPPINGS[priceId].cycle
    } else {
      // Fallback to amount detection
      const amount = (currentPrice?.unit_amount || 0) / 100
      const interval = currentPrice?.recurring?.interval
      
      if (interval === 'month') {
        if (amount === 9) detectedPlan = 'starter'
        else if (amount === 19) detectedPlan = 'professional'
        else if (amount === 29) detectedPlan = 'enterprise'
        detectedCycle = 'monthly'
      } else if (interval === 'year') {
        if (amount === 90) detectedPlan = 'starter'
        else if (amount === 190) detectedPlan = 'professional'
        else if (amount === 290) detectedPlan = 'enterprise'
        detectedCycle = 'yearly'
      }
    }

    return NextResponse.json({
      user: {
        email: user.email,
        id: user.id
      },
      database: {
        plan_id: dbSub.plan_id,
        billing_cycle: dbSub.billing_cycle,
        stripe_price_id: dbSub.stripe_price_id,
        status: dbSub.status,
        current_period_end: dbSub.current_period_end,
        updated_at: dbSub.updated_at
      },
      stripe: {
        subscription_id: subscription.id,
        status: subscription.status,
        price_id: priceId,
        amount: (currentPrice?.unit_amount || 0) / 100,
        interval: currentPrice?.recurring?.interval,
        current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
        current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        metadata: subscription.metadata
      },
      detected: {
        plan: detectedPlan,
        cycle: detectedCycle,
        should_be: `${detectedPlan} ${detectedCycle}`
      },
      mismatch: {
        plan: dbSub.plan_id !== detectedPlan,
        cycle: dbSub.billing_cycle !== detectedCycle,
        needs_fix: dbSub.plan_id !== detectedPlan || dbSub.billing_cycle !== detectedCycle
      }
    })

  } catch (error: any) {
    console.error('Debug status error:', error)
    return NextResponse.json({ 
      error: 'Failed to get debug status', 
      details: error.message 
    }, { status: 500 })
  }
}