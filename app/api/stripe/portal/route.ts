import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Stripe customer ID from database
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription?.stripe_customer_id) {
      // If no customer ID, they haven't subscribed yet
      return NextResponse.json({ 
        error: 'No billing account found. Please subscribe first.',
        redirect: '/#pricing'
      }, { status: 404 })
    }

    // Create a portal session
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/dashboard/billing`,
      })

      return NextResponse.json({ url: session.url })
    } catch (stripeError: any) {
      console.error('Stripe portal error:', stripeError)
      
      // Check if it's a configuration issue
      if (stripeError.message?.includes('No such customer')) {
        return NextResponse.json({ 
          error: 'Customer not found in Stripe. Please contact support.',
        }, { status: 404 })
      }
      
      if (stripeError.message?.includes('portal')) {
        return NextResponse.json({ 
          error: 'Customer portal not configured in Stripe. Please enable it in your Stripe dashboard.',
        }, { status: 500 })
      }
      
      throw stripeError
    }

  } catch (error: any) {
    console.error('Portal session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}