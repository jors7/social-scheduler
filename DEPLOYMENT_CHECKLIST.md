# Deployment Checklist - IMPORTANT!

## Database Setup Required in Supabase

You need to run these SQL scripts in your Supabase SQL Editor in this order:

### 1. Create user_subscriptions table
Run: `/supabase/migrations/20250107_create_subscription_system.sql`

### 2. Create subscription functions
Run: `/supabase/migrations/20250107_create_subscription_functions.sql`

### 3. Create auto-assign trigger for free plan
Run: `/supabase/migrations/20250108_auto_assign_free_plan.sql`

### 4. Update pricing plans
Run: `/supabase/migrations/20250108_update_pricing_plans.sql`

### 5. Create billing tables
Run: `/supabase/migrations/20250108_create_billing_tables.sql`

### 6. Fix signup trigger (CRITICAL)
Run: `/supabase/migrations/cleanup_and_fix_signup.sql`

## Why Signup is Failing

The signup process fails if the database trigger that auto-assigns a free plan isn't working. This happens when:
1. The trigger doesn't exist
2. The trigger has an error
3. The user_subscriptions table doesn't exist

## Quick Test

After running the SQL scripts, test signup:
1. Go to `/api/debug/signup-test` 
2. Send a POST request with `{"email": "test@example.com", "password": "password123"}`
3. Check if a subscription is created

## Environment Variables Needed in Vercel

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
STRIPE_SECRET_KEY (optional for now)
```