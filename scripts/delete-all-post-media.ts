/**
 * Delete ALL files from post-media bucket
 * Run with: npx tsx scripts/delete-all-post-media.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function deleteAllFiles() {
  console.log('🗑️  Deleting all files from post-media bucket...\n')

  try {
    // List all files
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from('post-media')
      .list('', { limit: 1000 })

    if (rootError) throw rootError

    const folders = rootFiles?.filter(f => f.id === null).map(f => f.name) || []
    folders.push('') // Include root

    let totalDeleted = 0

    for (const folder of folders) {
      const { data: files, error } = await supabase.storage
        .from('post-media')
        .list(folder === '' ? undefined : folder, { limit: 1000 })

      if (error) {
        console.error(`Error listing ${folder}:`, error)
        continue
      }

      if (!files) continue

      const filesToDelete = files
        .filter(f => f.name !== '.emptyFolderPlaceholder' && f.id !== null)
        .map(f => folder === '' ? f.name : `${folder}/${f.name}`)

      if (filesToDelete.length > 0) {
        console.log(`Deleting ${filesToDelete.length} files from ${folder || 'root'}...`)

        const { error: deleteError } = await supabase.storage
          .from('post-media')
          .remove(filesToDelete)

        if (deleteError) {
          console.error(`Error deleting files:`, deleteError)
        } else {
          totalDeleted += filesToDelete.length
          console.log(`✅ Deleted ${filesToDelete.length} files`)
        }
      }
    }

    console.log(`\n✅ Total deleted: ${totalDeleted} files`)
  } catch (error) {
    console.error('Error:', error)
  }
}

deleteAllFiles()
