import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

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

        // Update Stripe customer metadata with Supabase user ID
        await stripe.customers.update(session.customer as string, {
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
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)

          const { error: subError } = await supabaseAdmin
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              plan_id: metadata?.plan_id || 'starter',
              status: subscription.status,
              billing_cycle: metadata?.billing_cycle || 'monthly',
              stripe_subscription_id: subscription.id,
              stripe_customer_id: session.customer as string,
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

    // Generate a magic link for auto-login
    console.log('🔐 Generating magic link for user:', userId)

    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: customerEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`
      }
    })

    if (magicLinkError || !magicLinkData) {
      console.error('❌ Failed to generate magic link:', magicLinkError)
      return NextResponse.redirect(
        new URL('/?error=login_failed', process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    console.log('✅ Magic link generated, redirecting to dashboard')

    // Redirect to the magic link (auto-logs in the user)
    return NextResponse.redirect(magicLinkData.properties.action_link)

  } catch (error) {
    console.error('❌ Stripe callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'unknown_error'
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorMessage)}`, process.env.NEXT_PUBLIC_APP_URL!)
    )
  }
}
