import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { PlanId, BillingCycle } from '@/lib/subscription/plans'
import { syncStripeSubscriptionToDatabase } from '@/lib/subscription/sync'
import {
  queuePaymentReceiptEmail,
  queueSubscriptionCancelledEmail,
  queuePlanUpgradedEmail,
  queuePlanDowngradedEmail,
} from '@/lib/email/send'
import { handleCancellation } from '@/lib/affiliate/service'

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

  // Check for duplicate events (idempotency)
  let webhookEventId: string | null = null
  try {
    // First, check if this event has already been processed
    const { data: existingEvent } = await supabaseAdmin
      .from('webhook_events')
      .select('id, status')
      .eq('stripe_event_id', event.id)
      .single()

    if (existingEvent) {
      if (existingEvent.status === 'completed') {
        console.log('⚠️ Duplicate webhook event detected, already processed:', event.id)
        return NextResponse.json({
          received: true,
          message: 'Event already processed',
          duplicate: true,
          event: event.type
        })
      }
      // Event exists but wasn't completed - might be a retry, update and continue
      webhookEventId = existingEvent.id
      console.log('🔄 Retrying previously failed webhook event:', event.id)
    } else {
      // New event - insert it
      const { data: webhookLog } = await supabaseAdmin
        .from('webhook_events')
        .insert({
          stripe_event_id: event.id,
          event_type: event.type,
          status: 'processing',
          event_data: event as any,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      webhookEventId = webhookLog?.id || null
    }
  } catch (logError) {
    console.error('⚠️ Failed to check/log webhook event (non-blocking):', logError)
    // Continue processing even if logging fails
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
            // Use direct query instead of listUsers() for efficiency
            if (actualEmail) {
              console.log('🔍 Looking up user by email:', actualEmail)
              // Query users table directly by email - much more efficient than listUsers()
              const { data: userRecord, error: userLookupError } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', actualEmail)
                .single()

              if (userRecord && !userLookupError) {
                user_id = userRecord.id
                console.log('✅ Found user_id by email lookup:', user_id)
              } else {
                // Log warning but don't use inefficient listUsers() fallback
                // The callback endpoint should handle user creation
                console.warn('User not found in users table by email:', actualEmail)
                console.warn('User lookup error:', userLookupError?.message)
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
          
          // Check if this subscription already exists and is active (avoid race condition)
          const { data: existingActiveSub } = await supabaseAdmin
            .from('user_subscriptions')
            .select('id, is_active, status')
            .eq('stripe_subscription_id', (subscription as any).id)
            .eq('is_active', true)
            .single()

          if (existingActiveSub) {
            console.log('⚠️ Subscription already exists and is active, skipping creation:', existingActiveSub.id)
            // Just update the status if different
            if (existingActiveSub.status !== (subscription as any).status) {
              await supabaseAdmin
                .from('user_subscriptions')
                .update({
                  status: (subscription as any).status,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingActiveSub.id)
            }
            break // Exit the checkout.session.completed case early
          }

          // Mark any existing active subscriptions for this user as inactive first
          // (other subscriptions, not the one we're creating)
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

          // Note: Welcome emails are now sent from the callback endpoint
          // after user account is created, to avoid race condition

          const planName = plan_id.charAt(0).toUpperCase() + plan_id.slice(1)

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
                description: `Started 7-day free trial for ${planName} plan`,
                metadata: { type: 'trial_started', plan_id },
                created_at: new Date().toISOString()
              })

            if (historyError) {
              console.error('Error recording trial start:', historyError)
              // Don't throw, this is not critical
            } else {
              console.log('Trial start recorded in payment history')
            }

            // Check if this signup came from an affiliate referral
            const affiliate_id = session.metadata?.affiliate_id || (subscription as any).metadata?.affiliate_id

            if (affiliate_id) {
              console.log('📧 Trial signup via affiliate, queuing notification:', affiliate_id)

              try {
                // Get affiliate details
                const { data: affiliate } = await supabaseAdmin
                  .from('affiliates')
                  .select('id, user_id, referral_code')
                  .eq('id', affiliate_id)
                  .eq('status', 'active')
                  .single()

                if (affiliate) {
                  // Get affiliate user email
                  const { data: affiliateUserData } = await supabaseAdmin.auth.admin.getUserById(affiliate.user_id)

                  if (affiliateUserData?.user?.email) {
                    // Queue trial started notification
                    await supabaseAdmin.from('pending_emails').insert({
                      user_id: affiliate.user_id,
                      email_to: affiliateUserData.user.email,
                      email_type: 'affiliate_trial_started',
                      subject: 'New Trial Signup via Your Referral Link!',
                      template_data: {
                        affiliate_name: affiliateUserData.user.user_metadata?.full_name || affiliateUserData.user.email?.split('@')[0] || 'there',
                        plan_name: planName,
                        trial_days: 7,
                        referral_code: affiliate.referral_code,
                        dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/affiliate/dashboard`
                      },
                      metadata: {
                        session_id: session.id,
                        affiliate_id: affiliate.id,
                        customer_user_id: user_id
                      }
                    })

                    console.log('✅ Affiliate trial notification queued for:', affiliateUserData.user.email)
                  } else {
                    console.log('⚠️ Affiliate user has no email, skipping notification')
                  }
                } else {
                  console.log('⚠️ Affiliate not found or inactive:', affiliate_id)
                }
              } catch (affiliateError) {
                console.error('❌ Error queuing affiliate trial notification:', affiliateError)
                // Don't throw - trial notification is not critical
              }
            }
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event!.data.object as any
        console.log('Processing customer.subscription.updated:', {
          subscription_id: subscription.id,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end
        })

        // Check if subscription was just cancelled (cancel_at_period_end changed to true)
        if (subscription.cancel_at_period_end) {
          console.log('🚫 Subscription marked for cancellation at period end')

          // Get user_id from subscription metadata or database
          let userId = subscription.metadata?.user_id
          if (!userId) {
            const { data: existingSub } = await supabaseAdmin
              .from('user_subscriptions')
              .select('user_id, canceled_at')
              .eq('stripe_subscription_id', subscription.id)
              .single()
            userId = existingSub?.user_id

            // Only send email if this is the first cancellation (canceled_at is null in our DB)
            // This prevents duplicate emails when Stripe sends multiple webhooks
            if (existingSub?.canceled_at) {
              console.log('⏭️ Cancellation email already sent, skipping')
            } else if (userId) {
              const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId)
              if (user?.user?.email) {
                console.log('📧 Queueing cancellation email to:', user.user.email)
                const userName = user.user.user_metadata?.full_name || 'there'
                const planName = subscription.metadata?.plan_id?.charAt(0).toUpperCase() + subscription.metadata?.plan_id?.slice(1) || 'Premium'
                const endDate = subscription.status === 'trialing' && subscription.trial_end
                  ? new Date(subscription.trial_end * 1000)
                  : (subscription.cancel_at
                      ? new Date(subscription.cancel_at * 1000)
                      : (subscription.current_period_end
                          ? new Date(subscription.current_period_end * 1000)
                          : new Date()))

                await queueSubscriptionCancelledEmail(
                  userId,
                  user.user.email,
                  userName,
                  planName,
                  endDate,
                  subscription.id
                ).catch(err => {
                  console.error('❌ Error queueing cancellation email:', err)
                  console.error('Full error details:', JSON.stringify(err, null, 2))
                })
              }
            }
          } else {
            // userId from metadata, need to check if email was already sent
            const { data: existingSub } = await supabaseAdmin
              .from('user_subscriptions')
              .select('canceled_at')
              .eq('stripe_subscription_id', subscription.id)
              .single()

            if (existingSub?.canceled_at) {
              console.log('⏭️ Cancellation email already sent, skipping')
            } else {
              const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId)
              if (user?.user?.email) {
                console.log('📧 Queueing cancellation email to:', user.user.email)
                const userName = user.user.user_metadata?.full_name || 'there'
                const planName = subscription.metadata?.plan_id?.charAt(0).toUpperCase() + subscription.metadata?.plan_id?.slice(1) || 'Premium'
                const endDate = subscription.status === 'trialing' && subscription.trial_end
                  ? new Date(subscription.trial_end * 1000)
                  : (subscription.cancel_at
                      ? new Date(subscription.cancel_at * 1000)
                      : (subscription.current_period_end
                          ? new Date(subscription.current_period_end * 1000)
                          : new Date()))

                await queueSubscriptionCancelledEmail(
                  userId,
                  user.user.email,
                  userName,
                  planName,
                  endDate,
                  subscription.id
                ).catch(err => {
                  console.error('❌ Error queueing cancellation email:', err)
                  console.error('Full error details:', JSON.stringify(err, null, 2))
                })
              }
            }
          }

          // Handle affiliate conversion cancellation
          if (userId) {
            console.log('🔗 Handling affiliate cancellation for user:', userId)
            await handleCancellation(
              userId,
              subscription.id,
              subscription.status === 'trialing' ? 'trial_ended' : 'customer_cancelled'
            ).catch(err => {
              console.error('❌ Error handling affiliate cancellation:', err)
              // Don't throw - affiliate tracking shouldn't break the webhook
            })
          }
        }

        // Use the sync function to properly update everything including plan changes
        const result = await syncStripeSubscriptionToDatabase(subscription.id)

        if (!result.success) {
          console.error('Error syncing subscription update:', result.error)
          throw new Error(result.error || 'Failed to sync subscription')
        }

        console.log('Successfully synced subscription update')

        // Check if this was an upgrade/downgrade and send appropriate email
        // Query subscription_change_log for recent changes (last 2 minutes)
        const userId = subscription.metadata?.user_id
        if (userId) {
          const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
          const { data: recentChange } = await supabaseAdmin
            .from('subscription_change_log')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', twoMinutesAgo)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (recentChange && (recentChange.change_type === 'upgrade' || recentChange.change_type === 'downgrade')) {
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId)
            if (user?.user?.email) {
              const userName = user.user.user_metadata?.full_name || user.user.email?.split('@')[0] || 'there'
              const oldPlanName = recentChange.old_plan_id.charAt(0).toUpperCase() + recentChange.old_plan_id.slice(1)
              const newPlanName = recentChange.new_plan_id.charAt(0).toUpperCase() + recentChange.new_plan_id.slice(1)

              if (recentChange.change_type === 'upgrade') {
                // Check if there's a recent invoice that will/did handle the email
                // If subscription has latest_invoice (regardless of status), the invoice.payment_succeeded event will send the email with correct proration
                const invoiceWillHandle = subscription.latest_invoice !== null && subscription.latest_invoice !== undefined

                if (invoiceWillHandle) {
                  console.log('Skipping upgrade email in subscription.updated - invoice.payment_succeeded will handle it with correct proration amount')
                } else {
                  console.log('Detected upgrade in subscription.updated, sending upgrade email to:', user.user.email)
                  await queuePlanUpgradedEmail(
                    userId,
                    user.user.email,
                    userName,
                    oldPlanName,
                    newPlanName,
                    subscription.id,
                    0 // No prorated amount available in this event
                  ).catch(err => console.error('Error sending plan upgrade email:', err))
                }
              } else if (recentChange.change_type === 'downgrade') {
                console.log('Detected downgrade in subscription.updated - email already sent by change-plan API')
                // Note: Downgrade emails are sent immediately by the change-plan API endpoint
                // since no webhook fires when a downgrade is scheduled (Stripe subscription doesn't change)
              }
            }
          }
        }

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
            billing_cycle: 'monthly', // Default to monthly for free plan (NOT NULL constraint)
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

        // Queue cancellation email
        if (user_id) {
          const { data: user } = await supabaseAdmin.auth.admin.getUserById(user_id)
          if (user?.user?.email) {
            console.log('Queueing subscription cancelled email to:', user.user.email)
            const userName = user.user.user_metadata?.full_name || 'there'
            const planName = subscription.metadata?.plan_id?.charAt(0).toUpperCase() + subscription.metadata?.plan_id?.slice(1) || 'Premium'
            const endDate = subscription.status === 'trialing' && subscription.trial_end
              ? new Date(subscription.trial_end * 1000)
              : (subscription.cancel_at
                  ? new Date(subscription.cancel_at * 1000)
                  : (subscription.current_period_end
                      ? new Date(subscription.current_period_end * 1000)
                      : new Date()))
            await queueSubscriptionCancelledEmail(
              user_id,
              user.user.email,
              userName,
              planName,
              endDate,
              subscription.id
            ).catch(err => console.error('Error queueing cancellation email:', err))
          }
        }
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

            // =====================================================
            // AFFILIATE COMMISSION TRACKING
            // =====================================================
            // Check if this payment should generate an affiliate commission
            const affiliate_id = subscription.metadata?.affiliate_id
            if (affiliate_id && invoice.amount_paid > 0) {
              console.log('💰 Processing affiliate commission:', {
                affiliate_id,
                amount: invoice.amount_paid,
                subscription_id: subscription.id
              })

              try {
                // Get affiliate details
                const { data: affiliate } = await supabaseAdmin
                  .from('affiliates')
                  .select('id, user_id, commission_rate, total_earnings, pending_balance')
                  .eq('id', affiliate_id)
                  .eq('status', 'active')
                  .single()

                if (affiliate) {
                  // SELF-REFERRAL PREVENTION: Don't pay commission if affiliate is the customer
                  if (affiliate.user_id === userId) {
                    console.warn('🚫 Self-referral detected in webhook! Affiliate user_id matches customer user_id')
                    console.warn('   Affiliate ID:', affiliate.id, '| User ID:', userId)
                    console.warn('   Skipping commission payment')
                    // Don't process commission - exit the affiliate block
                  } else {
                    // Calculate commission (amount is in cents, convert to dollars)
                    const paymentAmount = invoice.amount_paid / 100
                    const commissionRate = affiliate.commission_rate || 30
                    const commissionAmount = parseFloat((paymentAmount * (commissionRate / 100)).toFixed(2))

                    console.log('💵 Commission calculated:', {
                      payment: paymentAmount,
                      rate: commissionRate + '%',
                      commission: commissionAmount
                    })

                  // Check if trial conversion already exists (created during signup)
                  const { data: existingConversion } = await supabaseAdmin
                    .from('affiliate_conversions')
                    .select('id, commission_amount')
                    .eq('affiliate_id', affiliate.id)
                    .eq('customer_user_id', userId)
                    .single()

                  let conversion
                  let conversionError

                  if (existingConversion) {
                    // Update existing trial conversion with payment details
                    console.log('📝 Updating existing trial conversion with payment:', existingConversion.id)

                    const { data: updated, error: updateError } = await supabaseAdmin
                      .from('affiliate_conversions')
                      .update({
                        subscription_id: userSub?.id,
                        commission_amount: commissionAmount,
                        status: 'pending',
                        payment_date: new Date().toISOString(),
                        stripe_invoice_id: invoice.id,
                      })
                      .eq('id', existingConversion.id)
                      .select()
                      .single()

                    conversion = updated
                    conversionError = updateError
                  } else {
                    // Create new conversion record (for direct paid signups without trial)
                    console.log('📝 Creating new conversion record')

                    const { data: created, error: createError } = await supabaseAdmin
                      .from('affiliate_conversions')
                      .insert({
                        affiliate_id: affiliate.id,
                        customer_user_id: userId,
                        subscription_id: userSub?.id,
                        commission_amount: commissionAmount,
                        status: 'pending',
                        payment_date: new Date().toISOString(),
                        stripe_invoice_id: invoice.id,
                      })
                      .select()
                      .single()

                    conversion = created
                    conversionError = createError
                  }

                  if (conversionError) {
                    console.error('❌ Error processing affiliate conversion:', conversionError)
                  } else {
                    console.log('✅ Affiliate conversion recorded:', conversion.id)

                    // Mark the affiliate click as converted for attribution tracking
                    try {
                      // Find the most recent unconverted click for this affiliate (within 30 days)
                      const thirtyDaysAgo = new Date()
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

                      const { data: recentClick, error: clickError } = await supabaseAdmin
                        .from('affiliate_clicks')
                        .select('id')
                        .eq('affiliate_id', affiliate.id)
                        .eq('converted', false)
                        .gte('created_at', thirtyDaysAgo.toISOString())
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single()

                      if (recentClick && !clickError) {
                        // Update the click record to mark as converted
                        const { error: updateClickError } = await supabaseAdmin
                          .from('affiliate_clicks')
                          .update({ converted: true })
                          .eq('id', recentClick.id)

                        if (updateClickError) {
                          console.error('❌ Error updating affiliate click:', updateClickError)
                        } else {
                          console.log('✅ Affiliate click marked as converted:', recentClick.id)
                        }
                      } else {
                        console.log('ℹ️ No unconverted click found for this conversion (may be direct signup)')
                      }
                    } catch (clickAttributionError) {
                      console.error('❌ Error with click attribution:', clickAttributionError)
                      // Don't throw - conversion is recorded, this is just for analytics
                    }

                    // Update affiliate earnings
                    const { error: updateError } = await supabaseAdmin
                      .from('affiliates')
                      .update({
                        total_earnings: affiliate.total_earnings + commissionAmount,
                        pending_balance: affiliate.pending_balance + commissionAmount,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', affiliate.id)

                    if (updateError) {
                      console.error('❌ Error updating affiliate earnings:', updateError)
                    } else {
                      console.log('✅ Affiliate earnings updated:', {
                        new_total: affiliate.total_earnings + commissionAmount,
                        new_pending: affiliate.pending_balance + commissionAmount
                      })

                      // Queue commission earned email to affiliate
                      // Check if this is their first commission
                      const { count } = await supabaseAdmin
                        .from('affiliate_conversions')
                        .select('*', { count: 'exact', head: true })
                        .eq('affiliate_id', affiliate.id)
                        .neq('status', 'refunded')

                      const isFirstCommission = count === 1

                      // Get affiliate user email
                      const { data: affiliateUserData } = await supabaseAdmin.auth.admin.getUserById(affiliate.user_id)

                      if (affiliateUserData?.user?.email) {
                        // Queue email notification
                        try {
                          await supabaseAdmin.from('pending_emails').insert({
                            user_id: affiliate.user_id,
                            email_to: affiliateUserData.user.email,
                            email_type: isFirstCommission ? 'affiliate_first_commission' : 'affiliate_commission_earned',
                            subject: isFirstCommission
                              ? 'Congratulations on Your First Commission!'
                              : `You Earned $${commissionAmount.toFixed(2)}!`,
                            template_data: {
                              affiliate_name: affiliateUserData.user.user_metadata?.full_name || affiliateUserData.user.email?.split('@')[0] || 'there',
                              commission_amount: commissionAmount,
                              payment_amount: paymentAmount,
                              commission_rate: commissionRate,
                              pending_balance: affiliate.pending_balance + commissionAmount,
                              total_earnings: affiliate.total_earnings + commissionAmount,
                              is_first_commission: isFirstCommission,
                              dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/affiliate/dashboard`
                            },
                            metadata: {
                              affiliate_id: affiliate.id,
                              invoice_id: invoice.id,
                              customer_user_id: userId
                            }
                          })

                          console.log('✅ Commission email queued for:', affiliateUserData.user.email)
                        } catch (err) {
                          console.error('Error queuing affiliate commission email:', err)
                        }
                      } else {
                        console.log('⚠️ Affiliate user has no email, skipping commission notification')
                      }
                    }
                  }
                  } // Close the self-referral else block
                } else {
                  console.log('⚠️ Affiliate not found or inactive:', affiliate_id)
                }
              } catch (affiliateError) {
                console.error('❌ Error processing affiliate commission:', affiliateError)
                // Don't throw - payment succeeded, just log the error
              }
            }
            // END AFFILIATE COMMISSION TRACKING
            // =====================================================

            // Check if this payment is related to an upgrade/downgrade
            // Query subscription_change_log for recent changes (last 5 minutes)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
            const { data: recentChange } = await supabaseAdmin
              .from('subscription_change_log')
              .select('*')
              .eq('user_id', userId)
              .gte('created_at', fiveMinutesAgo)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            // Send payment receipt email (skip for trial charges)
            if (invoice.billing_reason !== 'subscription_create' || invoice.amount_paid > 0) {
              const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId)
              if (user?.user?.email) {
                const userName = user.user.user_metadata?.full_name || 'there'
                const planName = planId.charAt(0).toUpperCase() + planId.slice(1)

                // Decide which email to send based on change type
                if (recentChange && recentChange.change_type === 'upgrade') {
                  console.log('Queueing plan upgrade email to:', user.user.email)
                  const oldPlanName = recentChange.old_plan_id.charAt(0).toUpperCase() + recentChange.old_plan_id.slice(1)
                  const newPlanName = recentChange.new_plan_id.charAt(0).toUpperCase() + recentChange.new_plan_id.slice(1)
                  await queuePlanUpgradedEmail(
                    userId,
                    user.user.email,
                    userName,
                    oldPlanName,
                    newPlanName,
                    subscription.id,
                    invoice.amount_paid, // This is the prorated amount
                    invoice.currency
                  ).catch(err => console.error('Error queueing plan upgrade email:', err))
                } else if (recentChange && recentChange.change_type === 'downgrade') {
                  console.log('Queueing plan downgrade email to:', user.user.email)
                  const oldPlanName = recentChange.old_plan_id.charAt(0).toUpperCase() + recentChange.old_plan_id.slice(1)
                  const newPlanName = recentChange.new_plan_id.charAt(0).toUpperCase() + recentChange.new_plan_id.slice(1)
                  // For downgrades, the change takes effect at period end
                  const effectiveDate = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : new Date()
                  await queuePlanDowngradedEmail(
                    userId,
                    user.user.email,
                    userName,
                    oldPlanName,
                    newPlanName,
                    effectiveDate,
                    subscription.id
                  ).catch(err => console.error('Error queueing plan downgrade email:', err))
                } else {
                  // No recent change detected, send standard payment receipt
                  console.log('Queueing payment receipt email to:', user.user.email)
                  await queuePaymentReceiptEmail(
                    userId,
                    user.user.email,
                    userName,
                    planName,
                    invoice.amount_paid,
                    invoice.currency,
                    invoice.id,
                    invoice.hosted_invoice_url || undefined
                  ).catch(err => console.error('Error queueing payment receipt email:', err))
                }
              }
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event!.data.object as any
        console.log('📨 invoice.payment_failed received:', {
          invoice_id: invoice.id,
          subscription_id: invoice.subscription,
          amount_due: invoice.amount_due,
          attempt_count: invoice.attempt_count
        })

        if (!invoice.subscription) {
          console.warn('⚠️ Invoice has no subscription, skipping')
          break
        }

        // Get subscription and user info
        const subscriptionResponse = await stripe.subscriptions.retrieve(invoice.subscription as string)
        const subscription = subscriptionResponse as any

        // Get user_id with fallback strategies
        let userId = subscription.metadata?.user_id

        if (!userId) {
          const { data: existingSub } = await supabaseAdmin
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single()

          userId = existingSub?.user_id

          if (!userId && subscription.customer) {
            const customer = await stripe.customers.retrieve(subscription.customer as string)
            userId = (customer as any).metadata?.supabase_user_id
          }
        }

        if (!userId) {
          console.error('❌ Could not determine user_id for failed payment')
          break
        }

        // Get user details for email
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId)

        if (!user?.user?.email) {
          console.error('❌ Could not find user email for failed payment notification')
          break
        }

        const userName = user.user.user_metadata?.full_name || 'there'

        // Get payment update URL from Stripe (customer portal or invoice URL)
        const updatePaymentUrl = invoice.hosted_invoice_url || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`

        // Queue payment failed email
        console.log('📧 Queueing payment failed email to:', user.user.email)
        const { queueEmail } = await import('@/lib/email/queue')
        await queueEmail({
          userId,
          emailTo: user.user.email,
          emailType: 'payment_failed',
          subject: 'Payment Failed - Action Required',
          templateData: {
            userName,
            amount: invoice.amount_due,
            currency: invoice.currency,
            updatePaymentUrl
          },
          uniqueIdentifier: invoice.id,
          metadata: {
            invoice_id: invoice.id,
            subscription_id: subscription.id,
            attempt_count: invoice.attempt_count
          }
        })

        // Record failed payment in payment_history
        const { data: userSub } = await supabaseAdmin
          .from('user_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single()

        await supabaseAdmin
          .from('payment_history')
          .insert({
            user_id: userId,
            subscription_id: userSub?.id,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: 'failed',
            stripe_payment_intent_id: invoice.payment_intent as string,
            stripe_invoice_id: invoice.id,
            description: `Payment failed (attempt ${invoice.attempt_count})`,
            metadata: {
              invoice_number: invoice.number,
              attempt_count: invoice.attempt_count,
              failure_code: invoice.last_finalization_error?.code,
              failure_message: invoice.last_finalization_error?.message
            },
            created_at: new Date().toISOString()
          })

        console.log('✅ Payment failure recorded and email queued')
        break
      }
    }

    const duration = Date.now() - startTime

    // Update webhook event status to completed
    if (webhookEventId) {
      await supabaseAdmin
        .from('webhook_events')
        .update({
          status: 'completed',
          processing_time_ms: duration,
          processed_at: new Date().toISOString()
        })
        .eq('id', webhookEventId)
    }

    console.log(`✅ Webhook processed successfully in ${duration}ms`, {
      type: event.type,
      id: event.id
    })
    return NextResponse.json({ received: true, event: event.type })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update webhook event status to failed
    if (webhookEventId) {
      await supabaseAdmin
        .from('webhook_events')
        .update({
          status: 'failed',
          error_message: errorMessage,
          processing_time_ms: duration,
          processed_at: new Date().toISOString()
        })
        .eq('id', webhookEventId)
    }

    console.error(`❌ Webhook handler error after ${duration}ms:`, {
      error: errorMessage,
      type: event?.type,
      id: event?.id,
      stack: error instanceof Error ? error.stack : undefined
    })

    // Determine if error is retryable
    // Non-retryable errors: return 200 to prevent Stripe retries
    // Retryable errors: return 500 so Stripe will retry
    const nonRetryablePatterns = [
      'user not found',
      'invalid user',
      'already processed',
      'duplicate',
      'no subscription',
      'missing metadata',
      'invalid metadata',
      'plan not found',
      'price not found'
    ]

    const isNonRetryable = nonRetryablePatterns.some(pattern =>
      errorMessage.toLowerCase().includes(pattern)
    )

    if (isNonRetryable) {
      // Return 200 to acknowledge receipt but log the error
      // This prevents Stripe from retrying an error that won't be fixed
      console.warn(`⚠️ Non-retryable webhook error (returning 200): ${errorMessage}`)
      return NextResponse.json({
        received: true,
        error: errorMessage,
        retryable: false,
        event: event?.type
      })
    }

    // Return 500 for transient errors that should be retried
    return NextResponse.json(
      { error: 'Webhook handler failed', details: errorMessage, retryable: true },
      { status: 500 }
    )
  }
}