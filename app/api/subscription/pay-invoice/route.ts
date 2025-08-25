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

    console.log('Attempting to pay incomplete invoices for:', user.email)

    // Get user's subscription to find Stripe customer ID
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .single()

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ 
        error: 'No Stripe customer found' 
      }, { status: 404 })
    }

    // Get all open/draft invoices for this customer
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      status: 'open',
      limit: 10
    })

    console.log(`Found ${invoices.data.length} open invoices`)

    const results = []
    for (const invoice of invoices.data) {
      try {
        if (!invoice.id) continue
        
        // First, finalize the invoice if it's in draft
        let finalizedInvoice = invoice
        if (invoice.status === 'draft') {
          finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
        }

        // Try to pay the invoice
        const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id!)
        
        results.push({
          invoice_id: paidInvoice.id,
          amount: paidInvoice.amount_paid / 100,
          status: 'paid',
          message: 'Invoice paid successfully'
        })
        
        console.log('Successfully paid invoice:', paidInvoice.id)
      } catch (payError: any) {
        console.error('Failed to pay invoice:', invoice.id, payError.message)
        
        // Get the payment URL for manual payment
        results.push({
          invoice_id: invoice.id,
          amount: invoice.amount_due / 100,
          status: 'payment_required',
          payment_url: invoice.hosted_invoice_url,
          error: payError.message
        })
      }
    }

    // Also check for the latest subscription invoice
    if (subscription.stripe_subscription_id) {
      const sub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
      
      if ((sub as any).latest_invoice && typeof (sub as any).latest_invoice === 'string') {
        const latestInvoice = await stripe.invoices.retrieve((sub as any).latest_invoice)
        
        if (latestInvoice.status === 'open' && latestInvoice.id) {
          try {
            const paidInvoice = await stripe.invoices.pay(latestInvoice.id)
            results.push({
              invoice_id: paidInvoice.id,
              amount: paidInvoice.amount_paid / 100,
              status: 'paid',
              message: 'Latest subscription invoice paid'
            })
          } catch (payError: any) {
            results.push({
              invoice_id: latestInvoice.id,
              amount: latestInvoice.amount_due / 100,
              status: 'payment_required',
              payment_url: latestInvoice.hosted_invoice_url,
              error: payError.message
            })
          }
        }
      }
    }

    // If any invoices need manual payment, return the payment URL
    const needsPayment = results.find(r => r.status === 'payment_required')
    if (needsPayment) {
      return NextResponse.json({
        message: 'Payment required to complete',
        payment_url: needsPayment.payment_url,
        results
      }, { status: 402 })
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} invoices`,
      results
    })

  } catch (error: any) {
    console.error('Error paying invoices:', error)
    return NextResponse.json(
      { error: 'Failed to process invoices', details: error.message },
      { status: 500 }
    )
  }
}