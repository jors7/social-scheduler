import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { r2Storage } from '@/lib/r2/storage';
import { R2_PUBLIC_URL } from '@/lib/r2/client';

export const maxDuration = 300; // 5 minutes

/**
 * Cleanup orphaned media files from R2
 *
 * This cron job:
 * 1. Lists all files in R2 older than 24 hours
 * 2. Checks if each file URL exists in scheduled_posts or drafts
 * 3. Deletes files that are not referenced anywhere
 */
export async function GET(request: NextRequest) {
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
    const allFiles = await r2Storage.listObjects();

    if (allFiles.length === 0) {
      return NextResponse.json({
        message: 'No files in R2',
        deleted: 0,
        checked: 0
      });
    }

    // Filter files older than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldFiles = allFiles.filter(f => f.lastModified < cutoffTime);

    if (oldFiles.length === 0) {
      return NextResponse.json({
        message: 'No files older than 24 hours',
        deleted: 0,
        checked: allFiles.length
      });
    }

    // Get all media URLs from scheduled_posts
    const { data: scheduledPosts, error: scheduledError } = await supabase
      .from('scheduled_posts')
      .select('media_urls')
      .not('media_urls', 'is', null);

    if (scheduledError) {
      console.error('Error fetching scheduled posts:', scheduledError);
    }

    // Get all media URLs from drafts
    const { data: drafts, error: draftsError } = await supabase
      .from('drafts')
      .select('media_urls')
      .not('media_urls', 'is', null);

    if (draftsError) {
      console.error('Error fetching drafts:', draftsError);
    }

    // Build set of all referenced URLs
    const referencedUrls = new Set<string>();

    // Add URLs from scheduled posts
    if (scheduledPosts) {
      for (const post of scheduledPosts) {
        if (Array.isArray(post.media_urls)) {
          for (const url of post.media_urls) {
            // Handle both string URLs and object URLs
            if (typeof url === 'string') {
              referencedUrls.add(url);
            } else if (url && typeof url === 'object' && url.url) {
              referencedUrls.add(url.url);
              if (url.thumbnailUrl) {
                referencedUrls.add(url.thumbnailUrl);
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
            if (typeof url === 'string') {
              referencedUrls.add(url);
            } else if (url && typeof url === 'object' && url.url) {
              referencedUrls.add(url.url);
              if (url.thumbnailUrl) {
                referencedUrls.add(url.thumbnailUrl);
              }
            }
          }
        }
      }
    }

    // Find orphaned files
    const orphanedFiles: string[] = [];

    for (const file of oldFiles) {
      const publicUrl = r2Storage.getPublicUrl(file.key);

      if (!referencedUrls.has(publicUrl)) {
        orphanedFiles.push(file.key);
      }
    }

    // Delete orphaned files
    let deletedCount = 0;
    const errors: string[] = [];

    for (const key of orphanedFiles) {
      try {
        await r2Storage.delete(key);
        deletedCount++;
        console.log(`Deleted orphaned file: ${key}`);
      } catch (error) {
        const errorMsg = `Failed to delete ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return NextResponse.json({
      message: `Cleanup completed`,
      totalFiles: allFiles.length,
      filesOlderThan24h: oldFiles.length,
      referencedFiles: referencedUrls.size,
      orphanedFiles: orphanedFiles.length,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Orphaned media cleanup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cleanup failed' },
      { status: 500 }
    );
  }
}
