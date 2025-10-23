import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { PlanId, BillingCycle } from '@/lib/subscription/plans'
import { syncStripeSubscriptionToDatabase } from '@/lib/subscription/sync'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

// Create Supabase client with service role for webhook updates
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
  const startTime = Date.now()
  console.log('=== Stripe Webhook Received ===', new Date().toISOString())

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('❌ No stripe-signature header present')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Use single webhook secret - no fallback logic
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log('✅ Webhook verified:', {
      type: event.type,
      id: event.id,
      created: new Date(event.created * 1000).toISOString()
    })
  } catch (err) {
    const error = err as Error
    console.error('❌ Webhook signature verification failed:', error.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event!.type) {
      case 'checkout.session.completed': {
        const session = event!.data.object as Stripe.Checkout.Session
        let { user_id, plan_id, billing_cycle, user_email } = session.metadata!

        console.log('Processing checkout.session.completed:', { user_id, plan_id, billing_cycle, user_email })

        // For new signups, user_id might be 'new_signup' or 'pending'
        // Get the actual user_id from Stripe customer metadata (updated by callback endpoint)
        if (!user_id || user_id === 'new_signup' || user_id === 'pending') {
          console.log('⚠️ user_id is pending, fetching from customer metadata...')

          // First, get the actual email from the session (not metadata)
          let actualEmail = user_email
          if (!actualEmail || actualEmail === 'pending') {
            // Get email from session.customer_details (always present)
            actualEmail = (session as any).customer_details?.email

            if (!actualEmail) {
              // Fallback: get from customer
              const customer = await stripe.customers.retrieve(session.customer as string)
              actualEmail = (customer as any).email
            }

            console.log('📧 Extracted email from session:', actualEmail)
          }

          // Try to get user_id from customer metadata
          const customer = await stripe.customers.retrieve(session.customer as string)
          user_id = (customer as any).metadata?.supabase_user_id

          if (!user_id || user_id === 'pending') {
            // Last resort: Look up by email in Supabase (callback might have created it)
            if (actualEmail) {
              console.log('🔍 Looking up user by email:', actualEmail)
              const { data: users } = await supabaseAdmin.auth.admin.listUsers()
              const matchedUser = users.users.find(u => u.email === actualEmail)
              if (matchedUser) {
                user_id = matchedUser.id
                console.log('✅ Found user_id by email lookup:', user_id)
              }
            }
          }

          if (!user_id || user_id === 'pending') {
            console.error('❌ Could not determine user_id for new signup')
            console.error('Email used:', actualEmail)
            console.error('This likely means callback endpoint hasnt created account yet')

            // Return 200 to prevent Stripe from retrying, but log warning
            // The callback will create the account and update the subscription
            console.log('⏳ Returning 200 OK - callback will handle subscription creation')
            return NextResponse.json({
              received: true,
              message: 'Waiting for callback to create account',
              event: event.type
            })
          }
        }
        
        if (session.subscription) {
          const subscriptionId = typeof session.subscription === 'string' 
            ? session.subscription 
            : (session.subscription as any).id
          
          const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)
          // Handle the Response wrapper if present
          const subscription = 'current_period_end' in subscriptionResponse 
            ? subscriptionResponse 
            : (subscriptionResponse as any).data || subscriptionResponse
          
          const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000)
          const currentPeriodStart = new Date((subscription as any).current_period_start * 1000)
          const trialEnd = (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null
          
          console.log('Subscription dates:', {
            current_period_start: currentPeriodStart.toISOString(),
            current_period_end: currentPeriodEnd.toISOString(),
            trial_end: trialEnd?.toISOString(),
            status: (subscription as any).status
          })
          
          // Mark any existing active subscriptions as inactive first
          await supabaseAdmin
            .from('user_subscriptions')
            .update({
              is_active: false,
              replaced_by_subscription_id: (subscription as any).id,
              replacement_reason: 'Replaced by new subscription from checkout',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user_id)
            .eq('is_active', true)
            .neq('stripe_subscription_id', (subscription as any).id)
          
          // Create or update subscription in database
          const { data, error } = await supabaseAdmin
            .from('user_subscriptions')
            .upsert({
              user_id,
              plan_id,
              status: (subscription as any).status, // Changed from subscription_status to status
              billing_cycle,
              stripe_subscription_id: (subscription as any).id,
              stripe_customer_id: session.customer as string,
              current_period_start: currentPeriodStart.toISOString(),
              current_period_end: currentPeriodEnd.toISOString(),
              trial_end: trialEnd?.toISOString(),
              is_active: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'stripe_subscription_id' // Changed from user_id to stripe_subscription_id
            })
            .select()
            .single()
            
          if (error) {
            console.error('Error updating subscription:', error)
            throw error
          }
          
          console.log('Subscription updated successfully:', data)
          
          // If this is a trial, add a trial entry to payment history
          if ((subscription as any).status === 'trialing') {
            const { error: historyError } = await supabaseAdmin
              .from('payment_history')
              .insert({
                user_id,
                subscription_id: data?.id,
                amount: 0,
                currency: 'usd',
                status: 'succeeded',
                description: `Started 7-day free trial for ${plan_id.charAt(0).toUpperCase() + plan_id.slice(1)} plan`,
                metadata: { type: 'trial_started', plan_id },
                created_at: new Date().toISOString()
              })
            
            if (historyError) {
              console.error('Error recording trial start:', historyError)
              // Don't throw, this is not critical
            } else {
              console.log('Trial start recorded in payment history')
            }
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event!.data.object as any
        console.log('Processing customer.subscription.updated:', { 
          subscription_id: subscription.id,
          status: subscription.status 
        })
        
        // Use the sync function to properly update everything including plan changes
        const result = await syncStripeSubscriptionToDatabase(subscription.id)
        
        if (!result.success) {
          console.error('Error syncing subscription update:', result.error)
          throw new Error(result.error || 'Failed to sync subscription')
        }
        
        console.log('Successfully synced subscription update')
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event!.data.object as any // Type assertion to avoid strict typing issues
        let { user_id } = subscription.metadata

        // Get user_id from database if not in metadata
        if (!user_id) {
          const { data: existingSub } = await supabaseAdmin
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single()
          user_id = existingSub?.user_id
        }

        console.log('Processing customer.subscription.deleted (downgrade to free):', { user_id })

        // Instead of deactivating, downgrade to free tier
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_id: 'free',
            status: 'active', // Keep active but on free plan
            billing_cycle: null,
            stripe_subscription_id: null, // Remove Stripe subscription link
            is_active: true, // Keep user logged in with limited access
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error downgrading subscription to free:', error)
          throw error
        }

        console.log('✅ User downgraded to free tier successfully')
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event!.data.object as any // Type assertion to avoid strict typing issues

        // DEBUG: Log invoice details to understand structure
        console.log('📨 invoice.payment_succeeded received:', {
          invoice_id: invoice.id,
          has_subscription: !!invoice.subscription,
          subscription_id: invoice.subscription || 'MISSING',
          amount_paid: invoice.amount_paid,
          billing_reason: invoice.billing_reason,
          line_items_count: invoice.lines?.data?.length || 0
        })

        // Check if invoice has subscription attached
        if (!invoice.subscription) {
          console.warn('⚠️ Invoice has no subscription property, checking line items...')

          // Stripe doesn't always expand the subscription field in invoices
          // We need to fetch the full invoice with expanded subscription
          console.log('🔍 Fetching full invoice with expanded subscription...')

          try {
            const fullInvoiceResponse = await stripe.invoices.retrieve(invoice.id, {
              expand: ['subscription']
            })
            const fullInvoice = fullInvoiceResponse as any

            if (fullInvoice.subscription && typeof fullInvoice.subscription !== 'string') {
              invoice.subscription = fullInvoice.subscription.id
              console.log('✅ Found subscription from expanded invoice:', invoice.subscription)
            } else if (typeof fullInvoice.subscription === 'string') {
              invoice.subscription = fullInvoice.subscription
              console.log('✅ Found subscription ID from invoice:', invoice.subscription)
            } else {
              console.error('❌ Cannot find subscription even in expanded invoice')
              console.error('Invoice structure:', JSON.stringify({
                lines: fullInvoice.lines?.data?.[0]
              }, null, 2))
              break
            }
          } catch (retrieveError) {
            console.error('❌ Error retrieving full invoice:', retrieveError)
            break
          }
        }

        if (invoice.subscription) {
          const subscriptionResponse = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          const subscription = subscriptionResponse as any

          // CRITICAL FIX: Get user_id from multiple sources
          // For upgrades, metadata might be empty, so we look up by stripe_subscription_id
          let userId = subscription.metadata?.user_id

          if (!userId) {
            console.log('⚠️ No user_id in subscription metadata, looking up by stripe_subscription_id')
            const { data: existingSub } = await supabaseAdmin
              .from('user_subscriptions')
              .select('user_id')
              .eq('stripe_subscription_id', subscription.id)
              .single()

            userId = existingSub?.user_id

            if (!userId) {
              console.error('❌ Could not find user_id for subscription:', subscription.id)
              // Try to get from customer metadata as last resort
              if (subscription.customer) {
                const customer = await stripe.customers.retrieve(subscription.customer as string)
                userId = (customer as any).metadata?.supabase_user_id
              }
            }
          }

          console.log('Processing invoice.payment_succeeded:', {
            user_id: userId,
            subscription_id: subscription.id,
            amount: invoice.amount_paid,
            total: invoice.total,
            starting_balance: invoice.starting_balance,
            billing_reason: invoice.billing_reason
          })

          if (!userId) {
            console.error('❌ Failed to record payment: No user_id found')
            break
          }

          // Get or create subscription ID for linking
          const { data: userSub } = await supabaseAdmin
            .from('user_subscriptions')
            .select('id, plan_id, billing_cycle')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single()
          
          // Check if there was a credit applied (negative starting balance indicates credit)
          const creditApplied = invoice.starting_balance < 0 ? Math.abs(invoice.starting_balance) : 0

          // Build description including proration info
          // Use metadata first, fallback to database values for upgrades
          const planId = subscription.metadata?.plan_id || userSub?.plan_id || 'subscription'
          const billingCycle = subscription.metadata?.billing_cycle || userSub?.billing_cycle || 'recurring'

          let description = `Payment for ${planId} plan (${billingCycle})`
          if (creditApplied > 0) {
            description += ` - Credit applied: $${(creditApplied / 100).toFixed(2)}`
          }

          // Record payment in database
          const { error } = await supabaseAdmin
            .from('payment_history')
            .insert({
              user_id: userId,
              subscription_id: userSub?.id,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              status: 'succeeded',
              stripe_payment_intent_id: invoice.payment_intent as string,
              stripe_invoice_id: invoice.id,
              description,
              metadata: {
                invoice_number: invoice.number,
                billing_reason: invoice.billing_reason,
                plan_id: planId,
                billing_cycle: billingCycle,
                credit_applied: creditApplied,
                subtotal: invoice.subtotal,
                total: invoice.total,
                starting_balance: invoice.starting_balance
              },
              created_at: new Date().toISOString()
            })
            
          if (error) {
            console.error('Error recording payment:', error)
            // Don't throw here, payment already succeeded
          } else {
            console.log('Payment recorded with proration details')
          }
        }
        break
      }
    }

    const duration = Date.now() - startTime
    console.log(`✅ Webhook processed successfully in ${duration}ms`, {
      type: event.type,
      id: event.id
    })
    return NextResponse.json({ received: true, event: event.type })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Webhook handler error after ${duration}ms:`, {
      error: errorMessage,
      type: event?.type,
      id: event?.id,
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Webhook handler failed', details: errorMessage },
      { status: 500 }
    )
  }
}