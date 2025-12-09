/**
 * Script to check Supabase Storage usage and list files
 *
 * Run with: npx tsx scripts/check-supabase-storage.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface BucketStats {
  name: string
  fileCount: number
  totalSize: number
  files: Array<{
    name: string
    size: number
    created: string
  }>
}

async function listBucketFiles(bucketName: string): Promise<BucketStats> {
  const stats: BucketStats = {
    name: bucketName,
    fileCount: 0,
    totalSize: 0,
    files: []
  }

  try {
    // List all files in bucket recursively
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error(`Error listing files in ${bucketName}:`, error)
      return stats
    }

    if (!files || files.length === 0) {
      return stats
    }

    // Process each file
    for (const file of files) {
      if (file.name === '.emptyFolderPlaceholder') continue

      const metadata = file.metadata as any
      const size = metadata?.size || 0

      stats.files.push({
        name: file.name,
        size: size,
        created: file.created_at || 'unknown'
      })

      stats.totalSize += size
      stats.fileCount++
    }

    // Also check subfolders
    const folders = files.filter(f => f.id === null)
    for (const folder of folders) {
      const { data: subFiles, error: subError } = await supabase.storage
        .from(bucketName)
        .list(folder.name, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (subError) {
        console.error(`Error listing files in ${bucketName}/${folder.name}:`, subError)
        continue
      }

      if (!subFiles) continue

      for (const file of subFiles) {
        if (file.name === '.emptyFolderPlaceholder') continue

        const metadata = file.metadata as any
        const size = metadata?.size || 0

        stats.files.push({
          name: `${folder.name}/${file.name}`,
          size: size,
          created: file.created_at || 'unknown'
        })

        stats.totalSize += size
        stats.fileCount++
      }
    }

    return stats
  } catch (error) {
    console.error(`Error processing bucket ${bucketName}:`, error)
    return stats
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

async function main() {
  console.log('🔍 Checking Supabase Storage usage...\n')

  // List of known buckets to check
  const bucketsToCheck = ['post-media', 'media', 'avatars']

  let totalSize = 0
  let totalFiles = 0
  const bucketStats: BucketStats[] = []

  for (const bucketName of bucketsToCheck) {
    console.log(`Checking bucket: ${bucketName}...`)
    const stats = await listBucketFiles(bucketName)
    bucketStats.push(stats)
    totalSize += stats.totalSize
    totalFiles += stats.fileCount
  }

  // Print summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 STORAGE SUMMARY')
  console.log('='.repeat(80) + '\n')

  for (const stats of bucketStats) {
    console.log(`\n📁 Bucket: ${stats.name}`)
    console.log(`   Files: ${stats.fileCount}`)
    console.log(`   Size: ${formatBytes(stats.totalSize)}`)

    if (stats.fileCount > 0) {
      console.log(`   Largest files:`)
      const sortedFiles = [...stats.files].sort((a, b) => b.size - a.size).slice(0, 10)
      for (const file of sortedFiles) {
        console.log(`     - ${file.name} (${formatBytes(file.size)})`)
      }
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log(`🔢 TOTAL STORAGE USED: ${formatBytes(totalSize)} (${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB)`)
  console.log(`📄 TOTAL FILES: ${totalFiles}`)
  console.log('='.repeat(80))

  // Warning if over 1GB
  const sizeInGB = totalSize / (1024 * 1024 * 1024)
  if (sizeInGB > 1.0) {
    console.log('\n⚠️  WARNING: You are over the 1GB Supabase free tier limit!')
    console.log('💡 Consider cleaning up old files or migrating to R2 storage.')
  } else if (sizeInGB > 0.8) {
    console.log('\n⚠️  WARNING: You are approaching the 1GB Supabase free tier limit!')
  }
}

main().catch(console.error)
