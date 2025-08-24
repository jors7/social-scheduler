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

    console.log('Syncing payment history for user:', user.id)

    // Get user's subscription to find Stripe customer ID
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id, id')
      .eq('user_id', user.id)
      .single()

    if (!subscription?.stripe_customer_id) {
      console.log('No Stripe customer ID found')
      return NextResponse.json({ 
        message: 'No payment history available',
        payments: [] 
      })
    }

    console.log('Fetching invoices for customer:', subscription.stripe_customer_id)

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 20
    })

    console.log(`Found ${invoices.data.length} invoices`)

    // Process and insert payment history
    const payments = []
    for (const invoice of invoices.data) {
      // Skip draft or void invoices
      if (invoice.status !== 'paid') continue

      const paymentData = {
        user_id: user.id,
        subscription_id: subscription.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'succeeded',
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: invoice.payment_intent as string || null,
        description: invoice.description || `Payment for subscription`,
        metadata: {
          invoice_number: invoice.number,
          billing_reason: invoice.billing_reason,
          period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
          period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
          invoice_pdf: invoice.invoice_pdf,
          hosted_invoice_url: invoice.hosted_invoice_url
        },
        created_at: new Date(invoice.created * 1000).toISOString()
      }

      // Check if this payment already exists
      const { data: existing } = await supabaseAdmin
        .from('payment_history')
        .select('id')
        .eq('stripe_invoice_id', invoice.id)
        .single()

      if (!existing) {
        // Insert new payment record
        const { error: insertError } = await supabaseAdmin
          .from('payment_history')
          .insert(paymentData)

        if (insertError) {
          console.error('Error inserting payment:', insertError)
        } else {
          payments.push(paymentData)
          console.log('Added payment:', invoice.id)
        }
      }
    }

    // Also check for any charges without invoices (one-time payments)
    const charges = await stripe.charges.list({
      customer: subscription.stripe_customer_id,
      limit: 10
    })

    for (const charge of charges.data) {
      // Skip if already have invoice for this charge
      if (charge.invoice) continue
      if (charge.status !== 'succeeded') continue

      const paymentData = {
        user_id: user.id,
        subscription_id: subscription.id,
        amount: charge.amount,
        currency: charge.currency,
        status: 'succeeded',
        stripe_payment_intent_id: charge.payment_intent as string || null,
        description: charge.description || 'One-time payment',
        metadata: {
          charge_id: charge.id,
          receipt_url: charge.receipt_url
        },
        created_at: new Date(charge.created * 1000).toISOString()
      }

      // Check if this charge already exists
      const { data: existing } = await supabaseAdmin
        .from('payment_history')
        .select('id')
        .where('metadata->charge_id', 'eq', charge.id)
        .single()

      if (!existing) {
        const { error: insertError } = await supabaseAdmin
          .from('payment_history')
          .insert(paymentData)

        if (insertError) {
          console.error('Error inserting charge:', insertError)
        } else {
          payments.push(paymentData)
          console.log('Added charge:', charge.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${payments.length} new payment records`,
      payments: payments.length
    })

  } catch (error: any) {
    console.error('Payment sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync payment history', details: error.message },
      { status: 500 }
    )
  }
}