import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import {
  sendWelcomeEmail,
  sendTrialStartedEmail,
  sendSubscriptionCreatedEmail,
} from '@/lib/email/send'
import { addContactToAudience } from '@/lib/email/audience'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

// Use Supabase Admin client to create users
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      console.error('❌ No session_id provided in callback')
      return NextResponse.redirect(
        new URL('/?error=missing_session', process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    console.log('🔍 Processing Stripe checkout callback:', sessionId)

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription']
    })

    const metadata = session.metadata
    let customerEmail = metadata?.user_email
    const isNewSignup = metadata?.is_new_signup === 'true'

    // If email is 'pending', get it from the session or customer
    if (!customerEmail || customerEmail === 'pending') {
      // Try session.customer_details.email first (always present in checkout)
      customerEmail = (session as any).customer_details?.email

      // If still not found, try expanded customer object
      if (!customerEmail && typeof session.customer === 'object') {
        customerEmail = (session.customer as any)?.email
      }

      // If customer is just an ID, fetch the customer
      if (!customerEmail && typeof session.customer === 'string') {
        const customer = await stripe.customers.retrieve(session.customer)
        customerEmail = (customer as any)?.email
      }
    }

    console.log('📧 Customer email:', customerEmail, '| New signup:', isNewSignup)

    if (!customerEmail || customerEmail === 'pending') {
      console.error('❌ No email found in session')
      return NextResponse.redirect(
        new URL('/?error=missing_email', process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    let userId = metadata?.user_id

    // If this is a new signup, create the Supabase account
    if (isNewSignup && userId === 'new_signup') {
      console.log('🆕 Creating new Supabase account for:', customerEmail)

      // Generate a random password (user won't use it - they'll use magic links)
      const randomPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16)

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        password: randomPassword,
        email_confirm: true, // Auto-verify email since it came from Stripe
        user_metadata: {
          created_via: 'stripe_checkout',
          stripe_customer_id: session.customer,
        }
      })

      if (authError || !authData.user) {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers.users.find(u => u.email === customerEmail)

        if (existingUser) {
          console.log('✅ User already exists, using existing account:', existingUser.id)
          userId = existingUser.id
        } else {
          console.error('❌ Failed to create user:', authError)
          return NextResponse.redirect(
            new URL('/?error=account_creation_failed', process.env.NEXT_PUBLIC_APP_URL!)
          )
        }
      } else {
        userId = authData.user.id
        console.log('✅ New Supabase account created:', userId)

        // Add user to Resend marketing audience (non-blocking)
        const firstName = customerEmail.split('@')[0] || 'User'
        addContactToAudience(customerEmail, firstName).catch(err =>
          console.error('⚠️ Failed to add to Resend audience (non-blocking):', err)
        )

        // Get customer ID (handle both string and object)
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : (session.customer as any)?.id

        // Update Stripe customer metadata with Supabase user ID
        await stripe.customers.update(customerId, {
          metadata: {
            supabase_user_id: userId
          }
        })

        // Update subscription metadata with user ID
        if (session.subscription) {
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as any).id

          await stripe.subscriptions.update(subscriptionId, {
            metadata: {
              user_id: userId,
              user_email: customerEmail,
              plan_id: metadata?.plan_id || 'starter',
              billing_cycle: metadata?.billing_cycle || 'monthly',
            }
          })

          // Also create the subscription record in Supabase
          console.log('📝 Creating subscription record in database')
          const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)
          const subscription = subscriptionResponse as any // Type assertion to handle Stripe Response wrapper

          const { error: subError } = await supabaseAdmin
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              plan_id: metadata?.plan_id || 'starter',
              status: subscription.status,
              billing_cycle: metadata?.billing_cycle || 'monthly',
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              is_active: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'stripe_subscription_id'
            })

          if (subError) {
            console.error('⚠️ Error creating subscription record:', subError)
            // Don't fail the whole flow, webhook can retry
          } else {
            console.log('✅ Subscription record created in database')

            // Send welcome emails after account and subscription are created
            const userName = customerEmail.split('@')[0] || 'there'
            const planName = (metadata?.plan_id || 'starter').charAt(0).toUpperCase() +
                            (metadata?.plan_id || 'starter').slice(1)
            const billingCycle = metadata?.billing_cycle || 'monthly'

            console.log('📧 Sending welcome emails to:', customerEmail)

            // Don't send password setup link - user can set password from profile settings if needed
            const passwordSetupLink = undefined

            if (subscription.status === 'trialing') {
              // Send trial email with password setup link (removed redundant welcome email)
              await sendTrialStartedEmail(customerEmail, userName, planName, passwordSetupLink)
                .catch(err => console.error('Error sending trial email:', err))
              console.log('✅ Trial email sent')
            } else {
              // Send subscription email with password setup link (removed redundant welcome email)
              const amount = subscription.items?.data[0]?.price?.unit_amount || 0
              await sendSubscriptionCreatedEmail(customerEmail, userName, planName, billingCycle, amount, passwordSetupLink)
                .catch(err => console.error('Error sending subscription email:', err))
              console.log('✅ Subscription email sent')
            }

            // =====================================================
            // AFFILIATE TRACKING
            // =====================================================
            // Handle affiliate tracking for new signups
            const affiliate_id = metadata?.affiliate_id || subscription.metadata?.affiliate_id

            if (affiliate_id) {
              console.log('🔗 Processing affiliate tracking for trial signup:', affiliate_id)

              try {
                // Get affiliate details
                const { data: affiliate, error: affiliateError } = await supabaseAdmin
                  .from('affiliates')
                  .select('id, user_id, referral_code')
                  .eq('id', affiliate_id)
                  .eq('status', 'active')
                  .single()

                if (affiliateError || !affiliate) {
                  console.log('⚠️ Affiliate not found or inactive:', affiliate_id, affiliateError)
                } else {
                  console.log('✅ Affiliate found:', affiliate.referral_code)

                  // Get affiliate user email for notification
                  const { data: affiliateUserData } = await supabaseAdmin.auth.admin.getUserById(affiliate.user_id)

                  if (affiliateUserData?.user?.email) {
                    // Queue trial started notification to affiliate
                    console.log('📧 Queuing trial notification to affiliate:', affiliateUserData.user.email)

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
                        session_id: sessionId,
                        affiliate_id: affiliate.id,
                        customer_user_id: userId
                      }
                    })

                    console.log('✅ Affiliate trial notification queued')
                  } else {
                    console.log('⚠️ Affiliate user has no email, skipping notification')
                  }

                  // Mark the affiliate click as converted for attribution tracking
                  try {
                    console.log('🔍 Looking for unconverted click to mark as converted...')

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
                      console.log('ℹ️ No unconverted click found for this trial (may be direct signup)')
                    }
                  } catch (clickAttributionError) {
                    console.error('❌ Error with click attribution:', clickAttributionError)
                    // Don't throw - notification is more important than click attribution
                  }
                }
              } catch (affiliateError) {
                console.error('❌ Error processing affiliate tracking:', affiliateError)
                // Don't throw - affiliate tracking shouldn't break the signup flow
              }
            } else {
              console.log('ℹ️ No affiliate_id in metadata - direct signup')
            }
            // END AFFILIATE TRACKING
            // =====================================================
          }
        }
      }
    }

    if (!userId || userId === 'new_signup' || userId === 'pending') {
      console.error('❌ No valid user ID after account creation')
      return NextResponse.redirect(
        new URL('/?error=invalid_user', process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    // Create a magic link for the user to auto-login
    console.log('🔐 Creating magic link for user:', userId)

    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: customerEmail,
    })

    if (magicLinkError || !magicLinkData) {
      console.error('❌ Failed to generate magic link:', magicLinkError)
      return NextResponse.redirect(
        new URL('/?error=login_failed', process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    console.log('✅ Magic link created, redirecting to custom auth confirmation')

    // Redirect to our custom auth confirmation endpoint
    // This will verify the token and set session cookies
    const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?token=${encodeURIComponent(magicLinkData.properties.hashed_token)}&type=magiclink&redirect_to=${encodeURIComponent('/dashboard?subscription=success')}`

    return NextResponse.redirect(confirmUrl)

  } catch (error) {
    console.error('❌ Stripe callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'unknown_error'
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorMessage)}`, process.env.NEXT_PUBLIC_APP_URL!)
    )
  }
}
