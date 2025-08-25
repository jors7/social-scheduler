import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

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

    console.log('Ending trial for user:', user.email)

    // Get user's subscription from database
    const { data: dbSub } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .single()

    if (!dbSub?.stripe_subscription_id) {
      return NextResponse.json({ 
        error: 'No subscription found' 
      }, { status: 404 })
    }

    // Get the subscription from Stripe
    const subscription: any = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id)
    
    console.log('Current subscription status:', subscription.status)
    console.log('Trial end:', subscription.trial_end ? new Date(subscription.trial_end * 1000) : 'No trial')

    // End the trial and charge immediately
    const updatedSubscription = await stripe.subscriptions.update(
      dbSub.stripe_subscription_id,
      {
        trial_end: 'now',
        proration_behavior: 'always_invoice',
        billing_cycle_anchor: 'now',
        payment_behavior: 'error_if_incomplete'
      }
    )

    // Create an invoice and charge immediately if needed
    if (updatedSubscription.status === 'active' || updatedSubscription.status === 'trialing') {
      try {
        // Create and finalize an invoice for immediate payment
        const invoice = await stripe.invoices.create({
          customer: subscription.customer as string,
          subscription: subscription.id,
          auto_advance: true
        })
        
        if (invoice.id) {
          const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
          
          // Try to pay the invoice
          if (finalizedInvoice.amount_due > 0) {
            await stripe.invoices.pay(invoice.id)
            console.log('Invoice paid successfully:', invoice.id)
          }
        }
      } catch (invoiceError: any) {
        console.log('Could not create immediate invoice:', invoiceError.message)
        // This is okay, Stripe will handle billing
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Trial ended successfully',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        trial_end: (updatedSubscription as any).trial_end,
        current_period_end: new Date((updatedSubscription as any).current_period_end * 1000).toISOString()
      }
    })

  } catch (error: any) {
    console.error('Error ending trial:', error)
    return NextResponse.json(
      { error: 'Failed to end trial', details: error.message },
      { status: 500 }
    )
  }
}