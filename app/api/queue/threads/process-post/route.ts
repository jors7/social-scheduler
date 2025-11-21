import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySignatureAppRouter } from '@upstash/qstash/dist/nextjs';
import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

/**
 * QStash webhook handler for processing individual Threads thread posts
 * This endpoint is called by QStash to process one post at a time
 */
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, postIndex } = body;

    console.log(`[Thread Job ${jobId}] Processing post ${postIndex}`);

    if (!jobId || postIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing jobId or postIndex' },
        { status: 400 }
      );
    }

    // Create service role client (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Load thread job
    const { data: job, error: jobError } = await supabase
      .from('thread_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error(`[Thread Job ${jobId}] Job not found:`, jobError);
      return NextResponse.json(
        { error: 'Thread job not found' },
        { status: 404 }
      );
    }

    // Validate postIndex
    const posts = job.posts as string[];
    const mediaUrls = (job.media_urls || []) as any[][];

    if (postIndex >= posts.length) {
      console.error(`[Thread Job ${jobId}] Invalid postIndex ${postIndex}, max is ${posts.length - 1}`);
      return NextResponse.json(
        { error: 'Invalid postIndex' },
        { status: 400 }
      );
    }

    // Update job status to processing if not already
    if (job.status === 'pending') {
      await supabase
        .from('thread_jobs')
        .update({ status: 'processing', current_index: postIndex })
        .eq('id', jobId);
    }

    // Get Threads account
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', job.account_id)
      .single();

    if (accountError || !account) {
      throw new Error('Threads account not found');
    }

    const postText = posts[postIndex];
    const mediaUrl = mediaUrls[postIndex]?.[0]; // First media item for this post
    const previousPostIds = (job.published_post_ids || []) as string[];
    const previousPostId = previousPostIds[previousPostIds.length - 1]; // Last published post ID

    console.log(`[Thread Job ${jobId}] Post ${postIndex}: "${postText.substring(0, 30)}..."`);
    console.log(`[Thread Job ${jobId}] Media:`, mediaUrl ? 'Yes' : 'No');
    console.log(`[Thread Job ${jobId}] Reply to:`, previousPostId || 'None (first post)');

    // Get Threads user ID
    const meResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${account.access_token}`
    );

    if (!meResponse.ok) {
      const errorData = await meResponse.json();
      console.error(`[Thread Job ${jobId}] Failed to get Threads user ID:`, errorData);
      throw new Error('Failed to get Threads user ID');
    }

    const meData = await meResponse.json();
    const threadsUserId = meData.id;

    // Step 1: Create container
    const formData = new URLSearchParams();
    formData.append('access_token', account.access_token);

    if (mediaUrl) {
      // Extract URL from media object
      const mediaUrlString = typeof mediaUrl === 'string' ? mediaUrl : mediaUrl.url;

      // Determine media type
      const videoExtensions = ['.mp4', '.mov', '.m4v', '.avi', '.wmv', '.flv', '.webm'];
      const isVideo = videoExtensions.some(ext => mediaUrlString.toLowerCase().endsWith(ext));

      if (isVideo) {
        formData.append('media_type', 'VIDEO');
        formData.append('video_url', mediaUrlString);
        formData.append('caption', postText);
      } else {
        formData.append('media_type', 'IMAGE');
        formData.append('image_url', mediaUrlString);
        formData.append('caption', postText);
      }
    } else {
      formData.append('media_type', 'TEXT');
      formData.append('text', postText);
    }

    // Add reply_to_id if this is not the first post
    if (previousPostId) {
      formData.append('reply_to_id', previousPostId);
      console.log(`[Thread Job ${jobId}] Setting reply_to_id: ${previousPostId}`);
    }

    // Create container
    const createUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
    console.log(`[Thread Job ${jobId}] Creating container...`);

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const createData = await createResponse.json();

    if (!createResponse.ok || !createData.id) {
      console.error(`[Thread Job ${jobId}] Container creation failed:`, createData);
      throw new Error(createData.error?.message || 'Failed to create container');
    }

    const containerId = createData.id;
    console.log(`[Thread Job ${jobId}] Container created: ${containerId}`);

    // Step 2: Poll for media processing completion
    if (mediaUrl) {
      const mediaUrlString = typeof mediaUrl === 'string' ? mediaUrl : mediaUrl.url;
      const videoExtensions = ['.mp4', '.mov', '.m4v', '.avi', '.wmv', '.flv', '.webm'];
      const isVideo = videoExtensions.some(ext => mediaUrlString.toLowerCase().endsWith(ext));

      // Use dynamic polling instead of fixed delay
      const maxAttempts = isVideo ? 18 : 6; // Videos: 3 min (18×10s), Images: 1 min (6×10s)
      const pollInterval = 10000; // 10 seconds
      let attempts = 0;
      let ready = false;

      console.log(`[Thread Job ${jobId}] Polling for ${isVideo ? 'video' : 'image'} processing (max ${maxAttempts * pollInterval / 1000}s)...`);

      while (attempts < maxAttempts && !ready) {
        // Wait before checking status
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;

        // Check container status
        try {
          const statusUrl = `https://graph.threads.net/v1.0/${containerId}?fields=status&access_token=${account.access_token}`;
          const statusResponse = await fetch(statusUrl);
          const statusData = await statusResponse.json();
          const status = statusData.status;

          console.log(`[Thread Job ${jobId}] Status check ${attempts}/${maxAttempts}: ${status}`);

          if (status === 'FINISHED') {
            ready = true;
            console.log(`[Thread Job ${jobId}] Media processing completed after ${attempts * pollInterval / 1000}s`);
          } else if (status === 'ERROR') {
            throw new Error(`Media processing failed with ERROR status`);
          } else if (status === 'EXPIRED') {
            throw new Error(`Container expired (not published within 24 hours)`);
          }
          // If IN_PROGRESS or other status, continue polling
        } catch (statusError) {
          console.error(`[Thread Job ${jobId}] Status check failed:`, statusError);
          // Don't fail immediately - might be temporary API issue
          // Will retry on next attempt or timeout
        }
      }

      if (!ready) {
        throw new Error(`Media processing timeout after ${maxAttempts * pollInterval / 1000} seconds`);
      }
    }

    // Step 3: Publish container
    const publishFormData = new URLSearchParams();
    publishFormData.append('creation_id', containerId);
    publishFormData.append('access_token', account.access_token);

    const publishUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`;
    console.log(`[Thread Job ${jobId}] Publishing container...`);

    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: publishFormData.toString()
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok || !publishData.id) {
      console.error(`[Thread Job ${jobId}] Publish failed:`, publishData);
      throw new Error(publishData.error?.message || 'Failed to publish post');
    }

    const postId = publishData.id;
    console.log(`[Thread Job ${jobId}] Post published: ${postId}`);

    // Step 4: Update job with published post ID
    const updatedPostIds = [...previousPostIds, postId];
    const nextIndex = postIndex + 1;
    const isComplete = nextIndex >= posts.length;

    console.log(`[Thread Job ${jobId}] Progress: ${nextIndex}/${posts.length} posts published`);

    if (isComplete) {
      // Thread complete
      await supabase
        .from('thread_jobs')
        .update({
          status: 'completed',
          published_post_ids: updatedPostIds,
          current_index: nextIndex,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Update scheduled_post to posted status if linked
      if (job.scheduled_post_id) {
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'posted',
            posted_at: new Date().toISOString(),
            post_results: [
              {
                platform: 'threads',
                account_id: account.id,
                username: account.username,
                success: true,
                post_id: updatedPostIds[0], // First post ID as thread ID
                posted_at: new Date().toISOString()
              }
            ]
          })
          .eq('id', job.scheduled_post_id);
      }

      console.log(`[Thread Job ${jobId}] ✅ Thread completed with ${updatedPostIds.length} posts`);

      return NextResponse.json({
        success: true,
        completed: true,
        postId,
        totalPosts: posts.length
      });
    } else {
      // Queue next post
      await supabase
        .from('thread_jobs')
        .update({
          published_post_ids: updatedPostIds,
          current_index: nextIndex
        })
        .eq('id', jobId);

      // Determine delay for next post (wait for current post to be available as reply target)
      const delay = 5; // 5 seconds delay before queuing next post

      console.log(`[Thread Job ${jobId}] Queueing post ${nextIndex} with ${delay}s delay...`);

      // Queue next post via QStash
      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/queue/threads/process-post`,
        body: {
          jobId,
          postIndex: nextIndex
        },
        delay, // seconds
        retries: 3
      });

      console.log(`[Thread Job ${jobId}] Next post queued successfully`);

      return NextResponse.json({
        success: true,
        completed: false,
        postId,
        nextIndex,
        totalPosts: posts.length
      });
    }

  } catch (error) {
    console.error('[Thread Job] Processing error:', error);

    // Try to update job with error (best effort)
    if (request.body) {
      try {
        const body = await request.json();
        const { jobId } = body;

        if (jobId) {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          const { data: job } = await supabase
            .from('thread_jobs')
            .select('retry_count')
            .eq('id', jobId)
            .single();

          const retryCount = (job?.retry_count || 0) + 1;

          // Mark as failed after 3 retries
          if (retryCount >= 3) {
            await supabase
              .from('thread_jobs')
              .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error',
                retry_count: retryCount
              })
              .eq('id', jobId);
          } else {
            // Increment retry count
            await supabase
              .from('thread_jobs')
              .update({
                retry_count: retryCount,
                last_retry_at: new Date().toISOString()
              })
              .eq('id', jobId);
          }
        }
      } catch (updateError) {
        console.error('[Thread Job] Failed to update job with error:', updateError);
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process post' },
      { status: 500 }
    );
  }
}

// Export with QStash signature verification
export const POST = verifySignatureAppRouter(handler);

// Configure body size limit (Next.js 14 route segment config)
export const maxDuration = 60; // 60 seconds max
