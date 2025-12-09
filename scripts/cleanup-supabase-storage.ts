/**
 * Script to clean up old files from Supabase Storage
 *
 * This script will:
 * 1. List all files in Supabase Storage buckets
 * 2. Identify files older than a certain date
 * 3. Delete them (after confirmation)
 *
 * Run with: npx tsx scripts/cleanup-supabase-storage.ts
 *
 * Options:
 * --dry-run: Preview what would be deleted without actually deleting
 * --older-than-days=30: Delete files older than N days (default: 30)
 * --bucket=post-media: Only clean specific bucket
 *
 * Example: npx tsx scripts/cleanup-supabase-storage.ts --dry-run --older-than-days=7
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

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

interface FileToDelete {
  bucket: string
  path: string
  size: number
  created: Date
}

function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    dryRun: args.includes('--dry-run'),
    olderThanDays: 30,
    bucket: null as string | null
  }

  for (const arg of args) {
    if (arg.startsWith('--older-than-days=')) {
      config.olderThanDays = parseInt(arg.split('=')[1])
    }
    if (arg.startsWith('--bucket=')) {
      config.bucket = arg.split('=')[1]
    }
  }

  return config
}

async function listAllFiles(bucketName: string, olderThan: Date): Promise<FileToDelete[]> {
  const filesToDelete: FileToDelete[] = []

  try {
    // List files in root
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' }
      })

    if (rootError) {
      console.error(`Error listing root files in ${bucketName}:`, rootError)
      return filesToDelete
    }

    // Find folders
    const folders = rootFiles?.filter(f => f.id === null).map(f => f.name) || []

    // Add root as well to process root-level files
    folders.push('')

    // Process each folder
    for (const folder of folders) {
      const prefix = folder === '' ? '' : folder + '/'
      const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list(folder === '' ? undefined : folder, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'asc' }
        })

      if (error) {
        console.error(`Error listing files in ${bucketName}/${folder}:`, error)
        continue
      }

      if (!files) continue

      for (const file of files) {
        if (file.name === '.emptyFolderPlaceholder') continue
        if (file.id === null) continue // Skip folders

        const createdAt = new Date(file.created_at || Date.now())
        const metadata = file.metadata as any
        const size = metadata?.size || 0

        if (createdAt < olderThan) {
          filesToDelete.push({
            bucket: bucketName,
            path: prefix + file.name,
            size: size,
            created: createdAt
          })
        }
      }
    }

    return filesToDelete
  } catch (error) {
    console.error(`Error processing bucket ${bucketName}:`, error)
    return filesToDelete
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

async function confirmDeletion(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question('\n⚠️  Are you sure you want to delete these files? (yes/no): ', (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'yes')
    })
  })
}

async function main() {
  const config = parseArgs()

  console.log('🧹 Supabase Storage Cleanup Tool\n')
  console.log(`Mode: ${config.dryRun ? '🔍 DRY RUN (no files will be deleted)' : '⚠️  LIVE (files will be deleted!)'}`)
  console.log(`Cutoff: Files older than ${config.olderThanDays} days\n`)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - config.olderThanDays)
  console.log(`Files created before ${cutoffDate.toISOString()} will be deleted.\n`)

  const bucketsToCheck = config.bucket ? [config.bucket] : ['post-media', 'media']
  const allFilesToDelete: FileToDelete[] = []

  // Collect files to delete
  for (const bucket of bucketsToCheck) {
    console.log(`Scanning bucket: ${bucket}...`)
    const files = await listAllFiles(bucket, cutoffDate)
    allFilesToDelete.push(...files)
    console.log(`  Found ${files.length} old files in ${bucket}`)
  }

  if (allFilesToDelete.length === 0) {
    console.log('\n✅ No old files found to delete!')
    return
  }

  // Calculate total size
  const totalSize = allFilesToDelete.reduce((sum, f) => sum + f.size, 0)

  // Show summary
  console.log('\n' + '='.repeat(80))
  console.log('📋 FILES TO DELETE')
  console.log('='.repeat(80))
  console.log(`Total files: ${allFilesToDelete.length}`)
  console.log(`Total size: ${formatBytes(totalSize)} (${(totalSize / (1024 * 1024)).toFixed(2)} MB)`)

  // Group by bucket
  const byBucket = allFilesToDelete.reduce((acc, f) => {
    if (!acc[f.bucket]) acc[f.bucket] = []
    acc[f.bucket].push(f)
    return acc
  }, {} as Record<string, FileToDelete[]>)

  console.log('\nBy bucket:')
  for (const [bucket, files] of Object.entries(byBucket)) {
    const size = files.reduce((sum, f) => sum + f.size, 0)
    console.log(`  ${bucket}: ${files.length} files (${formatBytes(size)})`)
  }

  // Show sample files
  console.log('\nSample files (oldest 10):')
  allFilesToDelete
    .sort((a, b) => a.created.getTime() - b.created.getTime())
    .slice(0, 10)
    .forEach((f) => {
      console.log(`  ${f.bucket}/${f.path} - ${formatBytes(f.size)} - ${f.created.toISOString()}`)
    })

  if (config.dryRun) {
    console.log('\n🔍 DRY RUN MODE: No files were deleted.')
    console.log('Run without --dry-run to actually delete these files.')
    return
  }

  // Confirm deletion
  const confirmed = await confirmDeletion()

  if (!confirmed) {
    console.log('\n❌ Deletion cancelled.')
    return
  }

  // Delete files
  console.log('\n🗑️  Deleting files...')
  let deleted = 0
  let failed = 0

  for (const file of allFilesToDelete) {
    try {
      const { error } = await supabase.storage
        .from(file.bucket)
        .remove([file.path])

      if (error) {
        console.error(`Failed to delete ${file.bucket}/${file.path}:`, error.message)
        failed++
      } else {
        deleted++
        if (deleted % 10 === 0) {
          console.log(`  Deleted ${deleted}/${allFilesToDelete.length} files...`)
        }
      }
    } catch (error) {
      console.error(`Error deleting ${file.bucket}/${file.path}:`, error)
      failed++
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ CLEANUP COMPLETE')
  console.log('='.repeat(80))
  console.log(`Deleted: ${deleted} files`)
  console.log(`Failed: ${failed} files`)
  console.log(`Freed up: ~${formatBytes(totalSize)}`)
}

main().catch(console.error)
