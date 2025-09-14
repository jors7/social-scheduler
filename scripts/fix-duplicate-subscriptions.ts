#!/usr/bin/env tsx
/**
 * Script to fix duplicate Stripe subscriptions for users
 * This addresses the bug where users could have multiple active subscriptions
 * 
 * Usage: npm run fix-subscriptions [email]
 * Example: npm run fix-subscriptions jan.orsula1@gmail.com
 */

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

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

interface SubscriptionInfo {
  id: string
  status: string
  plan: string
  amount: number
  interval: string
  created: Date
  current_period_end: Date
}

async function getStripeSubscriptionsForCustomer(customerId: string): Promise<SubscriptionInfo[]> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    expand: ['data.items.data.price']
  })
  
  return subscriptions.data.map(sub => {
    // Cast to any to handle Stripe SDK type issues
    const subscription = sub as any
    const price = subscription.items.data[0]?.price as any
    return {
      id: subscription.id,
      status: subscription.status,
      plan: price?.metadata?.plan_id || 'unknown',
      amount: (price?.unit_amount || 0) / 100,
      interval: price?.recurring?.interval || 'unknown',
      created: new Date(subscription.created * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000)
    }
  })
}

async function fixUserSubscriptions(email?: string) {
  console.log('🔍 Starting subscription fix process...\n')
  
  // Get users to check
  let query = supabaseAdmin
    .from('user_subscriptions')
    .select('user_id, stripe_customer_id, stripe_subscription_id, plan_id, status')
  
  if (email) {
    // Get specific user by email
    const { data: userData } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single()
    
    if (!userData) {
      console.error(`❌ User with email ${email} not found`)
      return
    }
    
    query = query.eq('user_id', userData.id)
  }
  
  const { data: subscriptions, error } = await query
  
  if (error) {
    console.error('❌ Error fetching subscriptions:', error)
    return
  }
  
  if (!subscriptions || subscriptions.length === 0) {
    console.log('No subscriptions found')
    return
  }
  
  // Group by customer ID to check for duplicates
  const customerMap = new Map<string, typeof subscriptions>()
  
  for (const sub of subscriptions) {
    if (!sub.stripe_customer_id) continue
    
    if (!customerMap.has(sub.stripe_customer_id)) {
      customerMap.set(sub.stripe_customer_id, [])
    }
    customerMap.get(sub.stripe_customer_id)!.push(sub)
  }
  
  // Check each customer for multiple active subscriptions
  for (const [customerId, userSubs] of Array.from(customerMap.entries())) {
    console.log(`\n📊 Checking customer: ${customerId}`)
    console.log(`   Database records: ${userSubs.length}`)
    
    // Get all Stripe subscriptions for this customer
    const stripeSubscriptions = await getStripeSubscriptionsForCustomer(customerId)
    const activeStripeSubscriptions = stripeSubscriptions.filter(s => 
      ['active', 'trialing'].includes(s.status)
    )
    
    console.log(`   Stripe subscriptions: ${stripeSubscriptions.length} total, ${activeStripeSubscriptions.length} active`)
    
    if (activeStripeSubscriptions.length > 1) {
      console.log('\n⚠️  MULTIPLE ACTIVE SUBSCRIPTIONS DETECTED!')
      console.log('   Active subscriptions:')
      
      for (const sub of activeStripeSubscriptions) {
        console.log(`   - ${sub.id}:`)
        console.log(`     Plan: ${sub.plan} (${sub.interval})`)
        console.log(`     Amount: $${sub.amount}`)
        console.log(`     Status: ${sub.status}`)
        console.log(`     Created: ${sub.created.toISOString()}`)
        console.log(`     Period ends: ${sub.current_period_end.toISOString()}`)
      }
      
      // Determine which subscription to keep (prefer annual, then higher tier, then newest)
      const subscriptionToKeep = activeStripeSubscriptions.sort((a, b) => {
        // First, prefer yearly over monthly
        if (a.interval === 'year' && b.interval !== 'year') return -1
        if (b.interval === 'year' && a.interval !== 'year') return 1
        
        // Then, prefer higher amount (indicates higher tier)
        if (a.amount !== b.amount) return b.amount - a.amount
        
        // Finally, prefer newer subscription
        return b.created.getTime() - a.created.getTime()
      })[0]
      
      console.log(`\n✅ Recommended action: Keep ${subscriptionToKeep.id} (${subscriptionToKeep.plan} ${subscriptionToKeep.interval})`)
      console.log('   Cancel these subscriptions:')
      
      for (const sub of activeStripeSubscriptions) {
        if (sub.id !== subscriptionToKeep.id) {
          console.log(`   - ${sub.id} (${sub.plan} ${sub.interval})`)
          
          if (process.argv.includes('--fix')) {
            try {
              // Cancel the duplicate subscription immediately
              await stripe.subscriptions.cancel(sub.id, {
                prorate: true,
                invoice_now: false
              })
              console.log(`     ✅ Cancelled subscription ${sub.id}`)
              
              // Update database to mark as inactive
              await supabaseAdmin
                .from('user_subscriptions')
                .update({
                  status: 'canceled',
                  is_active: false,
                  canceled_at: new Date().toISOString(),
                  replacement_reason: 'Duplicate subscription cleanup',
                  replaced_by_subscription_id: subscriptionToKeep.id
                })
                .eq('stripe_subscription_id', sub.id)
              
            } catch (error) {
              console.error(`     ❌ Error cancelling ${sub.id}:`, error)
            }
          }
        }
      }
      
      if (!process.argv.includes('--fix')) {
        console.log('\n💡 To apply these fixes, run: npm run fix-subscriptions --fix')
      }
    } else if (activeStripeSubscriptions.length === 0) {
      console.log('   ✅ No active subscriptions (user may have cancelled)')
    } else {
      console.log('   ✅ Single active subscription - no issues detected')
    }
    
    // Check for orphaned database records
    const dbSubIds = userSubs.map(s => s.stripe_subscription_id).filter(Boolean)
    const stripeSubIds = stripeSubscriptions.map(s => s.id)
    const orphanedIds = dbSubIds.filter(id => !stripeSubIds.includes(id!))
    
    if (orphanedIds.length > 0) {
      console.log(`\n⚠️  Found ${orphanedIds.length} orphaned database records (no matching Stripe subscription)`)
      for (const orphanId of orphanedIds) {
        console.log(`   - ${orphanId}`)
        
        if (process.argv.includes('--fix')) {
          await supabaseAdmin
            .from('user_subscriptions')
            .update({
              status: 'canceled',
              is_active: false,
              replacement_reason: 'Orphaned record - no matching Stripe subscription'
            })
            .eq('stripe_subscription_id', orphanId)
          console.log(`     ✅ Marked as inactive`)
        }
      }
    }
  }
  
  console.log('\n✨ Subscription check complete!')
}

// Parse command line arguments
const emailArg = process.argv.find(arg => arg.includes('@'))

// Run the fix
fixUserSubscriptions(emailArg).catch(console.error)