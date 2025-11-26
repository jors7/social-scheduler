import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

export async function POST(request: NextRequest) {
  try {
    // Get the current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invoiceId } = await request.json()

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })
    }

    // First, get the user's subscription to find their Stripe customer ID
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Retrieve the invoice from Stripe
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId)

      // SECURITY: Verify the invoice belongs to this user's customer ID
      if (invoice.customer !== subscription.stripe_customer_id) {
        console.warn(`Invoice access denied: user ${user.id} tried to access invoice ${invoiceId} belonging to customer ${invoice.customer}`)
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }

      // Return the hosted invoice URL
      if (invoice.hosted_invoice_url) {
        return NextResponse.json({ url: invoice.hosted_invoice_url })
      } else {
        // If no hosted URL, try to get the PDF
        return NextResponse.json({ url: invoice.invoice_pdf || null })
      }
    } catch (stripeError: any) {
      console.error('Stripe error retrieving invoice:', stripeError)

      // If invoice not found or error, try to create a customer portal session
      // This allows customers to view all their invoices
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: subscription.stripe_customer_id,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
        })

        return NextResponse.json({ url: session.url })
      } catch (portalError) {
        console.error('Error creating portal session:', portalError)
      }

      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    
  } catch (error) {
    console.error('Invoice URL error:', error)
    return NextResponse.json(
      { error: 'Failed to get invoice URL' },
      { status: 500 }
    )
  }
}