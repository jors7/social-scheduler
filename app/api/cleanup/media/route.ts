import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySignatureAppRouter } from '@upstash/qstash/dist/nextjs';

/**
 * Delayed Media Cleanup Endpoint
 * Called via QStash after a delay to clean up media files
 * for posts that used platforms requiring delayed cleanup (TikTok, Pinterest, Bluesky)
 */

// Create service role client for storage operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, mediaUrls } = body;

    if (!postId || !mediaUrls || !Array.isArray(mediaUrls)) {
      return NextResponse.json(
        { error: 'Missing postId or mediaUrls' },
        { status: 400 }
      );
    }

    console.log(`[Delayed Cleanup] Processing cleanup for post ${postId}`);

    // Verify the post is still in a final state (posted or failed)
    const { data: post, error: postError } = await supabase
      .from('scheduled_posts')
      .select('status, media_urls')
      .eq('id', postId)
      .single();

    if (postError) {
      console.error(`[Delayed Cleanup] Failed to fetch post ${postId}:`, postError);
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Only cleanup if post is in a final state
    if (post.status !== 'posted' && post.status !== 'failed') {
      console.log(`[Delayed Cleanup] Post ${postId} is still in status '${post.status}', skipping cleanup`);
      return NextResponse.json({
        success: false,
        reason: 'Post not in final state',
        status: post.status
      });
    }

    // Extract file paths from media URLs
    const filePaths: string[] = [];
    for (const mediaItem of mediaUrls) {
      const url = typeof mediaItem === 'string' ? mediaItem : mediaItem?.url;
      if (!url) continue;

      // Extract path from Supabase storage URL
      // Format: https://xxx.supabase.co/storage/v1/object/public/media/user_id/filename
      const match = url.match(/\/storage\/v1\/object\/public\/media\/(.+)$/);
      if (match) {
        filePaths.push(match[1]);
      }
    }

    if (filePaths.length === 0) {
      console.log(`[Delayed Cleanup] No valid file paths found for post ${postId}`);
      return NextResponse.json({
        success: true,
        cleaned: 0,
        message: 'No files to clean up'
      });
    }

    console.log(`[Delayed Cleanup] Cleaning up ${filePaths.length} files for post ${postId}`);

    // Delete files from storage
    const { data: deleteData, error: deleteError } = await supabase.storage
      .from('media')
      .remove(filePaths);

    if (deleteError) {
      console.error(`[Delayed Cleanup] Storage delete error for post ${postId}:`, deleteError);
      return NextResponse.json(
        { error: 'Failed to delete files', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log(`[Delayed Cleanup] Successfully cleaned up ${deleteData?.length || 0} files for post ${postId}`);

    return NextResponse.json({
      success: true,
      cleaned: deleteData?.length || 0,
      postId
    });

  } catch (error) {
    console.error('[Delayed Cleanup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with QStash signature verification
export const POST = verifySignatureAppRouter(handler);

// Configure for longer timeout (cleanup can take time for many files)
export const maxDuration = 30;
