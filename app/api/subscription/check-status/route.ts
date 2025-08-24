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
    
    // Create both regular and service clients
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
    
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    // Get subscription from database (using service role to bypass RLS)
    const { data: dbSubscription, error: dbError } = await serviceSupabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If there's a Stripe subscription ID, fetch from Stripe
    let stripeSubscription: any = null
    if (dbSubscription?.stripe_subscription_id && !dbSubscription.stripe_subscription_id.startsWith('manual_')) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(dbSubscription.stripe_subscription_id)
      } catch (stripeError: any) {
        console.error('Error fetching from Stripe:', stripeError.message)
      }
    }

    // Get customer from Stripe if exists
    let stripeCustomer: any = null
    if (dbSubscription?.stripe_customer_id) {
      try {
        stripeCustomer = await stripe.customers.retrieve(dbSubscription.stripe_customer_id)
      } catch (stripeError: any) {
        console.error('Error fetching customer from Stripe:', stripeError.message)
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      database: {
        subscription: dbSubscription,
        error: dbError?.message
      },
      stripe: {
        subscription: stripeSubscription ? {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          current_period_end: stripeSubscription.current_period_end,
          items: stripeSubscription.items.data.map((item: any) => ({
            id: item.id,
            price: {
              id: item.price.id,
              unit_amount: item.price.unit_amount,
              currency: item.price.currency,
              recurring: item.price.recurring
            }
          })),
          metadata: stripeSubscription.metadata
        } : null,
        customer: stripeCustomer ? {
          id: stripeCustomer.id,
          email: stripeCustomer.email,
          subscriptions: stripeCustomer.subscriptions?.data?.length || 0
        } : null
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error checking subscription status:', error)
    return NextResponse.json(
      { error: 'Failed to check subscription status', details: error.message },
      { status: 500 }
    )
  }
}