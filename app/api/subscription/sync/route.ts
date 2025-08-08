import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

// Create Supabase admin client for database updates
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

export async function POST(request: NextRequest) {
  console.log('=== Sync Subscription API Called ===')
  
  try {
    // Get the current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Auth check:', { userId: user?.id, error: authError })
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Syncing subscription for user:', user.id, 'Email:', user.email)

    // Check if user has a subscription in the database
    const { data: existingSub, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking subscription:', subError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // If no subscription exists, check Stripe for any active subscriptions
    if (!existingSub || !existingSub.stripe_customer_id) {
      console.log('No subscription found in database, checking Stripe...')
      
      // Search for customer by email in Stripe
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      })

      if (customers.data.length === 0) {
        console.log('No Stripe customer found for email:', user.email)
        return NextResponse.json({ 
          message: 'No subscription found',
          hasSubscription: false 
        })
      }

      const customer = customers.data[0]
      console.log('Found Stripe customer:', customer.id)

      // Get subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 10
      })

      console.log(`Found ${subscriptions.data.length} subscriptions for customer`)

      // Find active or trialing subscription
      const activeSubscription = subscriptions.data.find(
        sub => ['active', 'trialing'].includes(sub.status)
      )

      if (!activeSubscription) {
        console.log('No active subscription found in Stripe')
        return NextResponse.json({ 
          message: 'No active subscription found',
          hasSubscription: false 
        })
      }

      console.log('Found active subscription:', activeSubscription.id, 'Status:', activeSubscription.status)

      // Extract plan information from the subscription
      const priceId = activeSubscription.items.data[0]?.price.id
      let planId = 'free'
      let billingCycle = 'monthly'

      // Map price ID to plan
      if (priceId === process.env.STRIPE_STARTER_MONTHLY_PRICE_ID) {
        planId = 'starter'
        billingCycle = 'monthly'
      } else if (priceId === process.env.STRIPE_STARTER_YEARLY_PRICE_ID) {
        planId = 'starter'
        billingCycle = 'yearly'
      } else if (priceId === process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID) {
        planId = 'professional'
        billingCycle = 'monthly'
      } else if (priceId === process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID) {
        planId = 'professional'
        billingCycle = 'yearly'
      } else if (priceId === process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID) {
        planId = 'enterprise'
        billingCycle = 'monthly'
      } else if (priceId === process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID) {
        planId = 'enterprise'
        billingCycle = 'yearly'
      }

      console.log('Detected plan:', planId, 'Billing cycle:', billingCycle)

      // Create or update subscription in database
      const { data: upsertedSub, error: upsertError } = await supabaseAdmin
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          plan_id: planId,
          status: activeSubscription.status,
          billing_cycle: billingCycle,
          stripe_subscription_id: activeSubscription.id,
          stripe_customer_id: customer.id,
          current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
          trial_end: activeSubscription.trial_end 
            ? new Date(activeSubscription.trial_end * 1000).toISOString() 
            : null,
          cancel_at: activeSubscription.cancel_at 
            ? new Date(activeSubscription.cancel_at * 1000).toISOString() 
            : null,
          canceled_at: activeSubscription.canceled_at 
            ? new Date(activeSubscription.canceled_at * 1000).toISOString() 
            : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (upsertError) {
        console.error('Error upserting subscription:', upsertError)
        return NextResponse.json({ error: 'Failed to sync subscription' }, { status: 500 })
      }

      console.log('Subscription synced successfully:', upsertedSub)

      return NextResponse.json({ 
        message: 'Subscription synced successfully',
        subscription: upsertedSub,
        hasSubscription: true
      })

    } else {
      // Subscription exists, sync with Stripe
      console.log('Subscription exists, syncing with Stripe...')
      
      if (!existingSub.stripe_subscription_id) {
        console.log('No Stripe subscription ID in database')
        return NextResponse.json({ 
          message: 'No Stripe subscription ID found',
          hasSubscription: false 
        })
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(
          existingSub.stripe_subscription_id
        )

        console.log('Retrieved subscription from Stripe:', subscription.status)

        // Update subscription in database
        const { data: updatedSub, error: updateError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end 
              ? new Date(subscription.trial_end * 1000).toISOString() 
              : null,
            cancel_at: subscription.cancel_at 
              ? new Date(subscription.cancel_at * 1000).toISOString() 
              : null,
            canceled_at: subscription.canceled_at 
              ? new Date(subscription.canceled_at * 1000).toISOString() 
              : null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
        }

        console.log('Subscription updated successfully:', updatedSub)

        return NextResponse.json({ 
          message: 'Subscription synced successfully',
          subscription: updatedSub,
          hasSubscription: ['active', 'trialing'].includes(subscription.status)
        })

      } catch (stripeError: any) {
        console.error('Stripe error:', stripeError)
        
        // If subscription not found in Stripe, clear it from database
        if (stripeError.code === 'resource_missing') {
          await supabaseAdmin
            .from('user_subscriptions')
            .delete()
            .eq('user_id', user.id)
          
          return NextResponse.json({ 
            message: 'Subscription not found in Stripe, cleared from database',
            hasSubscription: false 
          })
        }
        
        return NextResponse.json({ 
          error: 'Failed to retrieve subscription from Stripe' 
        }, { status: 500 })
      }
    }

  } catch (error: any) {
    console.error('=== SYNC ERROR ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    console.error('Full error:', error)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}