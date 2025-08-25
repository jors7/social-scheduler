import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { syncStripeSubscriptionToDatabase } from '@/lib/subscription/sync'

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

    console.log('Fixing Enterprise subscription for:', user.email)

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
      expand: ['items.data.price']
    })

    // Check current price
    const currentItem = subscription.items.data[0]
    const currentPrice = currentItem.price
    const currentAmount = (currentPrice.unit_amount || 0) / 100

    console.log('Current subscription:', {
      price_id: currentPrice.id,
      amount: currentAmount,
      interval: currentPrice.recurring?.interval
    })

    // If it's the wrong price (e.g., $290/month instead of $29/month)
    if (currentAmount > 100 && currentPrice.recurring?.interval === 'month') {
      console.log('Found incorrect price, fixing...')
      
      // Get or create the correct Enterprise monthly price
      const correctPriceId = process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_1RtUP4A6BBN8qFjBI2hBmwcT'
      
      // Update the subscription to use the correct price
      const updatedSubscription = await stripe.subscriptions.update(
        subscription.id,
        {
          items: [{
            id: currentItem.id,
            price: correctPriceId,
          }],
          proration_behavior: 'none', // Don't create more invoices
        }
      )

      console.log('Subscription updated to correct price')

      // Sync to database
      const syncResult = await syncStripeSubscriptionToDatabase(
        subscription.id,
        user.id
      )

      // Also manually update the database to ensure it's correct
      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          plan_id: 'enterprise',
          billing_cycle: 'monthly',
          stripe_price_id: correctPriceId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Database update error:', updateError)
      }

      // Create a credit note for the overcharge
      const invoices = await stripe.invoices.list({
        subscription: subscription.id,
        limit: 5
      })

      const overchargedInvoice = invoices.data.find(inv => 
        inv.amount_paid > 3000 && inv.status === 'paid'
      )

      let creditNote = null
      if (overchargedInvoice && overchargedInvoice.id) {
        // Calculate the credit amount (what was paid minus what should have been paid)
        const shouldHavePaid = Math.round(10 * 100) // ~$10 prorated
        const actuallyPaid = overchargedInvoice.amount_paid
        const creditAmount = actuallyPaid - shouldHavePaid

        console.log('Creating credit note for overcharge:', creditAmount / 100)

        try {
          // Try to create a credit note for the overcharge
          creditNote = await stripe.creditNotes.create({
            invoice: overchargedInvoice.id,
            amount: creditAmount,
            reason: 'product_unsatisfactory',
            memo: 'Correcting overcharge due to incorrect price configuration'
          })
        } catch (creditError: any) {
          console.log('Could not create full credit note:', creditError.message)
          
          // If that fails, try a smaller amount (Stripe may have limits)
          try {
            // Try crediting just the difference between plans for a full month
            const monthlyDifference = (290 - 29) * 100 // $261
            creditNote = await stripe.creditNotes.create({
              invoice: overchargedInvoice.id,
              amount: Math.min(monthlyDifference, actuallyPaid),
              reason: 'product_unsatisfactory',
              memo: 'Correcting overcharge due to incorrect price configuration'
            })
          } catch (secondError: any) {
            console.log('Could not create any credit note:', secondError.message)
            // Continue without credit note - at least fix the subscription
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription fixed successfully',
        details: {
          old_amount: currentAmount,
          new_amount: 29,
          sync_result: syncResult,
          credit_note: creditNote ? {
            id: creditNote.id,
            amount: creditNote.amount / 100,
            status: creditNote.status
          } : null
        }
      })
    } else {
      // Already correct
      return NextResponse.json({
        success: true,
        message: 'Subscription is already correct',
        details: {
          amount: currentAmount,
          interval: currentPrice.recurring?.interval
        }
      })
    }

  } catch (error: any) {
    console.error('Fix Enterprise error:', error)
    return NextResponse.json({ 
      error: 'Failed to fix subscription', 
      details: error.message 
    }, { status: 500 })
  }
}