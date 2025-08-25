import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

export async function POST(request: NextRequest) {
  console.log('=== Revert to Enterprise Called ===')
  
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

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    console.log('Current subscription:', {
      plan_id: subscription.plan_id,
      stripe_subscription_id: subscription.stripe_subscription_id
    })

    // Revert the Stripe subscription back to Enterprise Annual
    if (subscription.stripe_subscription_id && !subscription.stripe_subscription_id.startsWith('manual_')) {
      try {
        // Get the Stripe subscription
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id,
          {
            expand: ['items.data.price']
          }
        )
        
        // Get Enterprise Annual price ID
        let enterprisePriceId = SUBSCRIPTION_PLANS.enterprise.stripe_price_id_yearly
        
        // If not configured, create one
        if (!enterprisePriceId) {
          const price = await stripe.prices.create({
            currency: 'usd',
            unit_amount: SUBSCRIPTION_PLANS.enterprise.price_yearly,
            recurring: {
              interval: 'year',
            },
            product_data: {
              name: 'Enterprise Plan',
              metadata: {
                plan_id: 'enterprise',
                description: SUBSCRIPTION_PLANS.enterprise.description,
              },
            },
          })
          enterprisePriceId = price.id
        }
        
        // Update the subscription back to Enterprise
        const currentItem = stripeSubscription.items.data[0]
        if (currentItem) {
          await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            {
              items: [{
                id: currentItem.id,
                price: enterprisePriceId,
              }],
              proration_behavior: 'none', // Don't charge/credit anything
              metadata: {
                user_id: user.id,
                plan_id: 'enterprise',
                billing_cycle: 'yearly',
              }
            }
          )
          
          console.log('Stripe subscription reverted to Enterprise Annual')
        }
      } catch (stripeError: any) {
        console.error('Failed to revert Stripe subscription:', stripeError)
        // Continue anyway to update database
      }
    }

    // Update the database to Enterprise Annual
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

    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        plan_id: 'enterprise',
        billing_cycle: 'yearly',
        // Clear any scheduled changes
        scheduled_plan_id: null,
        scheduled_billing_cycle: null,
        scheduled_change_date: null,
        scheduled_stripe_price_id: null,
        stripe_schedule_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to update database:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update subscription',
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully reverted to Enterprise Annual plan',
      plan: 'enterprise',
      billing_cycle: 'yearly'
    })

  } catch (error: any) {
    console.error('Revert to enterprise error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to revert to enterprise',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}