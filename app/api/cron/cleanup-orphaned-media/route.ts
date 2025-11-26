import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { r2Storage } from '@/lib/r2/storage';
import { R2_PUBLIC_URL } from '@/lib/r2/client';

export const maxDuration = 300; // 5 minutes

/**
 * Normalize URL for comparison
 * Handles: trailing/leading whitespace, double slashes, protocol consistency
 */
function normalizeUrl(url: string): string {
  return url
    .trim()
    .replace(/([^:]\/)\/+/g, '$1') // Remove double slashes (but not in protocol)
    .toLowerCase();
}

/**
 * Cleanup orphaned media files from R2
 *
 * This cron job:
 * 1. Lists all files in R2 older than 24 hours
 * 2. Checks if each file URL exists in scheduled_posts or drafts
 * 3. Deletes files that are not referenced anywhere
 *
 * Supports dry-run mode: ?dryRun=true (shows what would be deleted without deleting)
 */
export async function GET(request: NextRequest) {
  const startTime = new Date();
  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';

  console.log(`[CLEANUP] Starting orphaned media cleanup at ${startTime.toISOString()}`);
  console.log(`[CLEANUP] Mode: ${dryRun ? 'DRY-RUN (no deletions)' : 'LIVE'}`);

  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Supabase with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all files from R2
    console.log('[CLEANUP] Listing all R2 files...');
    const allFiles = await r2Storage.listObjects();
    console.log(`[CLEANUP] Total files in R2: ${allFiles.length}`);

    if (allFiles.length === 0) {
      return NextResponse.json({
        message: 'No files in R2',
        deleted: 0,
        checked: 0,
        dryRun
      });
    }

    // Filter files older than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldFiles = allFiles.filter(f => f.lastModified < cutoffTime);

    // ⚠️ PROTECT STATIC ASSETS FROM DELETION
    // Whitelist of protected prefixes that should NEVER be deleted
    const PROTECTED_PREFIXES = [
      'static-assets/',  // Application assets (logos, icons, hero images)
    ];

    /**
     * Check if a file is protected from cleanup
     * Protected files include app assets like logos, icons, and hero images
     */
    const isProtectedFile = (key: string): boolean => {
      return PROTECTED_PREFIXES.some(prefix => key.startsWith(prefix));
    };

    // Filter out protected files from old files
    const oldFilesUnprotected = oldFiles.filter(f => !isProtectedFile(f.key));
    const protectedCount = oldFiles.length - oldFilesUnprotected.length;

    console.log(`[CLEANUP] Cutoff time: ${cutoffTime.toISOString()}`);
    console.log(`[CLEANUP] Files older than 24h: ${oldFiles.length}`);
    console.log(`[CLEANUP] Protected files skipped: ${protectedCount}`);
    console.log(`[CLEANUP] Old files eligible for cleanup: ${oldFilesUnprotected.length}`);
    console.log(`[CLEANUP] Files newer than 24h: ${allFiles.length - oldFiles.length}`);

    if (oldFilesUnprotected.length === 0) {
      return NextResponse.json({
        message: 'No unprotected files older than 24 hours to clean up',
        deleted: 0,
        checked: allFiles.length,
        protectedFilesSkipped: protectedCount,
        dryRun
      });
    }

    // Get all posts with media URLs AND platforms (for exemption check)
    console.log('[CLEANUP] Fetching scheduled posts from database...');
    const { data: scheduledPosts, error: scheduledError } = await supabase
      .from('scheduled_posts')
      .select('media_urls, platforms')
      .not('media_urls', 'is', null);

    if (scheduledError) {
      console.error('[CLEANUP] Error fetching scheduled posts:', scheduledError);
    } else {
      console.log(`[CLEANUP] Found ${scheduledPosts?.length || 0} scheduled posts with media`);
    }

    // Get all media URLs from drafts
    console.log('[CLEANUP] Fetching drafts from database...');
    const { data: drafts, error: draftsError } = await supabase
      .from('drafts')
      .select('media_urls')
      .not('media_urls', 'is', null);

    if (draftsError) {
      console.error('[CLEANUP] Error fetching drafts:', draftsError);
    } else {
      console.log(`[CLEANUP] Found ${drafts?.length || 0} drafts with media`);
    }

    // Build set of all referenced URLs and platform-exempted URLs
    const referencedUrls = new Set<string>();
    const platformExemptedUrls = new Set<string>();
    const exemptedPlatforms = ['tiktok', 'pinterest', 'bluesky'];

    // Add URLs from scheduled posts
    if (scheduledPosts) {
      for (const post of scheduledPosts) {
        // Check if post is for exempted platforms
        const isExemptedPlatform = post.platforms &&
          Array.isArray(post.platforms) &&
          post.platforms.some((p: string) => exemptedPlatforms.includes(p.toLowerCase()));

        if (Array.isArray(post.media_urls)) {
          for (const url of post.media_urls) {
            // Handle both string URLs and object URLs
            if (typeof url === 'string' && url.trim() !== '') {
              const normalized = normalizeUrl(url);
              referencedUrls.add(normalized);
              if (isExemptedPlatform) {
                platformExemptedUrls.add(normalized);
              }
            } else if (url && typeof url === 'object') {
              if (url.url && typeof url.url === 'string') {
                const normalized = normalizeUrl(url.url);
                referencedUrls.add(normalized);
                if (isExemptedPlatform) {
                  platformExemptedUrls.add(normalized);
                }
              }
              if (url.thumbnailUrl && typeof url.thumbnailUrl === 'string') {
                const normalized = normalizeUrl(url.thumbnailUrl);
                referencedUrls.add(normalized);
                if (isExemptedPlatform) {
                  platformExemptedUrls.add(normalized);
                }
              }
            }
          }
        }
      }
    }

    // Add URLs from drafts
    if (drafts) {
      for (const draft of drafts) {
        if (Array.isArray(draft.media_urls)) {
          for (const url of draft.media_urls) {
            if (typeof url === 'string' && url.trim() !== '') {
              referencedUrls.add(normalizeUrl(url));
            } else if (url && typeof url === 'object') {
              if (url.url && typeof url.url === 'string') {
                referencedUrls.add(normalizeUrl(url.url));
              }
              if (url.thumbnailUrl && typeof url.thumbnailUrl === 'string') {
                referencedUrls.add(normalizeUrl(url.thumbnailUrl));
              }
            }
          }
        }
      }
    }

    console.log(`[CLEANUP] Total referenced URLs in database: ${referencedUrls.size}`);
    console.log(`[CLEANUP] Platform-exempted URLs (TikTok/Pinterest/Bluesky): ${platformExemptedUrls.size}`);

    // Debug: Show sample of referenced URLs
    if (referencedUrls.size > 0) {
      const sampleUrls = Array.from(referencedUrls).slice(0, 3);
      console.log('[CLEANUP] Sample referenced URLs:', sampleUrls);
    }

    // Find orphaned files
    const orphanedFiles: Array<{
      key: string;
      url: string;
      reason: string;
      size: number;
      lastModified: Date;
    }> = [];

    console.log('[CLEANUP] Checking each old unprotected file for references...');

    for (const file of oldFilesUnprotected) {
      const publicUrl = r2Storage.getPublicUrl(file.key);
      const normalizedUrl = normalizeUrl(publicUrl);

      const isReferenced = referencedUrls.has(normalizedUrl);
      const isExempted = platformExemptedUrls.has(normalizedUrl);

      // Debug logging for first few files
      if (orphanedFiles.length < 5) {
        console.log(`[CLEANUP] Checking file: ${file.key}`);
        console.log(`[CLEANUP]   Public URL: ${publicUrl}`);
        console.log(`[CLEANUP]   Normalized: ${normalizedUrl}`);
        console.log(`[CLEANUP]   Referenced: ${isReferenced}`);
        console.log(`[CLEANUP]   Platform exempted: ${isExempted}`);
      }

      if (isExempted) {
        console.log(`[CLEANUP] ⚠️  SKIPPING (platform exemption): ${file.key}`);
        continue;
      }

      if (!isReferenced) {
        orphanedFiles.push({
          key: file.key,
          url: publicUrl,
          reason: 'Not referenced in database',
          size: file.size,
          lastModified: file.lastModified
        });
      }
    }

    console.log(`[CLEANUP] Found ${orphanedFiles.length} orphaned files to delete`);

    // Delete orphaned files (or skip if dry-run)
    let deletedCount = 0;
    const errors: string[] = [];
    const deletedFiles: Array<{ key: string; url: string; size: number }> = [];

    if (dryRun) {
      console.log('[CLEANUP] DRY-RUN MODE: Skipping actual deletion');
      deletedFiles.push(...orphanedFiles.map(f => ({ key: f.key, url: f.url, size: f.size })));
    } else {
      for (const file of orphanedFiles) {
        try {
          console.log(`[CLEANUP] Deleting: ${file.key} (${Math.round(file.size / 1024)}KB)`);
          await r2Storage.delete(file.key);
          deletedCount++;
          deletedFiles.push({ key: file.key, url: file.url, size: file.size });
        } catch (error) {
          const errorMsg = `Failed to delete ${file.key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`[CLEANUP] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log(`[CLEANUP] Cleanup completed in ${duration}ms`);
    console.log(`[CLEANUP] Deleted: ${deletedCount} files`);
    console.log(`[CLEANUP] Errors: ${errors.length}`);

    return NextResponse.json({
      message: dryRun ? 'Dry-run completed (no files deleted)' : 'Cleanup completed',
      dryRun,
      totalFiles: allFiles.length,
      filesOlderThan24h: oldFiles.length,
      protectedFilesSkipped: protectedCount,
      eligibleForCleanup: oldFilesUnprotected.length,
      referencedFiles: referencedUrls.size,
      platformExemptedFiles: platformExemptedUrls.size,
      orphanedFiles: orphanedFiles.length,
      deleted: deletedCount,
      deletedFiles: deletedFiles.length > 0 ? deletedFiles : undefined,
      errors: errors.length > 0 ? errors : undefined,
      duration: `${duration}ms`,
      timestamp: endTime.toISOString()
    });

  } catch (error) {
    console.error('[CLEANUP] Orphaned media cleanup error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Cleanup failed',
        dryRun
      },
      { status: 500 }
    );
  }
}
