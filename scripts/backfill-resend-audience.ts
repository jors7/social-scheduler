/**
 * One-time script to backfill existing users into Resend marketing audience
 *
 * Usage:
 *   npx tsx scripts/backfill-resend-audience.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { addContactToAudience } from '../lib/email/audience'

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

async function backfillUsers() {
  console.log('🚀 Starting Resend audience backfill...\n')

  // Get all users from Supabase
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers()

  if (error) {
    console.error('❌ Error fetching users:', error)
    process.exit(1)
  }

  console.log(`📊 Found ${users.users.length} users to process\n`)

  let successCount = 0
  let alreadyExistsCount = 0
  let errorCount = 0

  // Process users in batches to avoid rate limits
  for (const user of users.users) {
    if (!user.email) {
      console.log(`⏭️  Skipping user ${user.id} (no email)`)
      continue
    }

    const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email.split('@')[0]
    const lastName = user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || undefined

    const result = await addContactToAudience(user.email, firstName, lastName)

    if (result.success) {
      if ((result as any).alreadyExists) {
        alreadyExistsCount++
      } else {
        successCount++
      }
    } else {
      errorCount++
      console.error(`❌ Failed to add ${user.email}:`, result.error)
    }

    // Small delay to avoid rate limits (Resend allows 10 req/sec on free tier)
    await new Promise(resolve => setTimeout(resolve, 150))
  }

  console.log('\n✅ Backfill complete!')
  console.log(`   - Successfully added: ${successCount}`)
  console.log(`   - Already existed: ${alreadyExistsCount}`)
  console.log(`   - Errors: ${errorCount}`)
  console.log(`   - Total processed: ${users.users.length}`)
}

backfillUsers().catch(console.error)
