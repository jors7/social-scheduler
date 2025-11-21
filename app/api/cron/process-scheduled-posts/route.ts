import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PostingService } from '@/lib/posting/service';
import { Receiver } from '@upstash/qstash';
import { r2Storage } from '@/lib/r2/storage';
import { R2_PUBLIC_URL } from '@/lib/r2/client';
import {
  postToFacebookDirect,
  postToBlueskyDirect,
  postToInstagramDirect,
  postToLinkedInDirect,
  postToTwitterDirect,
  postToThreadsDirect,
  postToPinterestDirect,
  postToTikTokDirect
} from '@/lib/posting/cron-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Shared processing logic for both GET and POST
async function processScheduledPosts(request: NextRequest) {
  try {
    // Verify authorization - accept both QStash signature and Bearer token
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    const testAuth = 'Bearer test';

    // Check for QStash signature
    const upstashSignature = request.headers.get('upstash-signature');
    let isQStashVerified = false;

    if (upstashSignature && process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY) {
      try {
        // Verify QStash signature
        const receiver = new Receiver({
          currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
          nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
        });

        // Get request body as text (empty for GET requests)
        const body = await request.text();

        // Verify the signature
        await receiver.verify({
          signature: upstashSignature,
          body: body,
        });

        isQStashVerified = true;
        console.log('✅ QStash signature verified');
      } catch (error) {
        console.log('❌ QStash signature verification failed:', error);
        // Continue to check bearer token
      }
    }

    // Accept if either QStash signature is valid OR bearer token is correct
    const isBearerTokenValid = authHeader === expectedAuth || authHeader === testAuth;

    if (!isQStashVerified && !isBearerTokenValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Authorization method:', isQStashVerified ? 'QStash signature' : 'Bearer token');

    console.log('=== Processing Scheduled Posts ===', new Date().toISOString());

    // Check required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
      return NextResponse.json({ error: 'Missing Supabase URL' }, { status: 500 });
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Missing Supabase service role key' }, { status: 500 });
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Proactively refresh TikTok tokens that are expiring soon
    console.log('=== Proactive TikTok Token Refresh ===');
    try {
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      // Get all active TikTok accounts with tokens expiring within 2 hours
      const { data: expiringAccounts, error: tokenError } = await supabase
        .from('social_accounts')
        .select('id, user_id, username, expires_at')
        .eq('platform', 'tiktok')
        .eq('is_active', true)
        .not('refresh_token', 'is', null)
        .lte('expires_at', twoHoursFromNow);

      if (!tokenError && expiringAccounts && expiringAccounts.length > 0) {
        console.log(`Found ${expiringAccounts.length} TikTok accounts with tokens expiring soon`);

        const { checkTikTokTokenExpiry, refreshTikTokToken } = await import('@/lib/tiktok/token-manager');

        for (const account of expiringAccounts) {
          // Pass the service role supabase client to bypass RLS
          const { needsRefresh, account: fullAccount } = await checkTikTokTokenExpiry(account.id, supabase);

          if (needsRefresh && fullAccount) {
            console.log(`Refreshing token for TikTok account: ${account.username || account.id}`);
            // Pass the service role supabase client to bypass RLS
            const { success, error } = await refreshTikTokToken(fullAccount, supabase);

            if (success) {
              console.log(`✅ Successfully refreshed token for ${account.username || account.id}`);
            } else {
              console.error(`❌ Failed to refresh token for ${account.username || account.id}:`, error);
            }
          }
        }
      } else {
        console.log('No TikTok tokens need refresh at this time');
      }
    } catch (refreshError) {
      console.error('Error during proactive token refresh:', refreshError);
      // Continue with post processing even if refresh fails
    }

    // Recover posts stuck in 'posting' status for more than 10 minutes
    console.log('=== Checking for stuck posts ===');
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const { data: stuckPosts, error: stuckError } = await supabase
        .from('scheduled_posts')
        .select('id, platforms, updated_at')
        .eq('status', 'posting')
        .lte('updated_at', tenMinutesAgo);

      if (!stuckError && stuckPosts && stuckPosts.length > 0) {
        console.log(`Found ${stuckPosts.length} posts stuck in 'posting' status`);

        for (const post of stuckPosts) {
          const { error: resetError } = await supabase
            .from('scheduled_posts')
            .update({
              status: 'failed',
              error_message: 'Post processing timed out after 10 minutes. The post may have been partially published - please check your social media accounts and try again.'
            })
            .eq('id', post.id);

          if (resetError) {
            console.error(`Failed to reset stuck post ${post.id}:`, resetError);
          } else {
            console.log(`✅ Marked stuck post ${post.id} as failed`);
          }
        }
      } else {
        console.log('No stuck posts found');
      }

      // Also check for posts stuck in 'processing' status for too long (>30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { data: stuckProcessingPosts, error: stuckProcessingError } = await supabase
        .from('scheduled_posts')
        .select('id, platforms, updated_at, processing_state')
        .eq('status', 'processing')
        .lte('updated_at', thirtyMinutesAgo);

      if (!stuckProcessingError && stuckProcessingPosts && stuckProcessingPosts.length > 0) {
        console.log(`Found ${stuckProcessingPosts.length} posts stuck in 'processing' status`);

        for (const post of stuckProcessingPosts) {
          const { error: resetError } = await supabase
            .from('scheduled_posts')
            .update({
              status: 'failed',
              error_message: 'Instagram video processing timed out after 30 minutes. Please try posting again with shorter videos or fewer media items.',
              processing_state: null
            })
            .eq('id', post.id);

          if (resetError) {
            console.error(`Failed to reset stuck processing post ${post.id}:`, resetError);
          } else {
            console.log(`✅ Marked stuck processing post ${post.id} as failed`);
          }
        }
      } else {
        console.log('No stuck processing posts found');
      }
    } catch (stuckError) {
      console.error('Error checking for stuck posts:', stuckError);
    }

    // Process posts in 'processing' status (Phase 2 of two-phase posting)
    console.log('=== Checking for processing posts (Phase 2) ===');
    try {
      const { data: processingPosts, error: processingError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'processing')
        .limit(5);

      if (!processingError && processingPosts && processingPosts.length > 0) {
        console.log(`Found ${processingPosts.length} posts in processing status`);

        const { InstagramClient } = await import('@/lib/instagram/client');
        const { ThreadsClient } = await import('@/lib/threads/client');

        for (const post of processingPosts) {
          try {
            const processingState = post.processing_state;
            if (!processingState) {
              console.log(`Post ${post.id} has no processing state, marking as failed`);
              await supabase
                .from('scheduled_posts')
                .update({
                  status: 'failed',
                  error_message: 'Invalid processing state'
                })
                .eq('id', post.id);
              continue;
            }

            // Handle Threads Phase 2 processing (single post video)
            if (processingState.platform === 'threads') {
              console.log(`[Threads Phase 2] Processing post ${post.id}`);

              if (!processingState.container_id) {
                console.log(`Post ${post.id} has no container_id, marking as failed`);
                await supabase
                  .from('scheduled_posts')
                  .update({
                    status: 'failed',
                    error_message: 'Invalid Threads processing state - missing container_id'
                  })
                  .eq('id', post.id);
                continue;
              }

              // Get the Threads account
              const { data: threadsAccounts } = await supabase
                .from('social_accounts')
                .select('*')
                .eq('user_id', post.user_id)
                .eq('platform', 'threads')
                .eq('is_active', true);

              if (!threadsAccounts || threadsAccounts.length === 0) {
                throw new Error('Threads account not found');
              }

              // Find the correct account based on selection
              let account;
              if (post.selected_accounts && post.selected_accounts['threads']) {
                const selectedIds = post.selected_accounts['threads'];
                account = threadsAccounts.find(acc => selectedIds.includes(acc.id));
                if (!account) {
                  console.log('Selected Threads account not found, falling back to first available');
                  account = threadsAccounts[0];
                }
              } else {
                account = threadsAccounts[0];
              }

              const threadsClient = new ThreadsClient({
                accessToken: account.access_token,
                userID: account.platform_user_id
              });

              // Check if container is ready
              const { ready, status } = await threadsClient.checkContainerReady(processingState.container_id);

              if (ready) {
                console.log(`[Threads Phase 2] Container ${processingState.container_id} ready, publishing...`);

                // Publish the container
                const result = await threadsClient.publishContainer(processingState.container_id);

                // Check if there are remaining accounts to process
                const remainingAccounts = processingState.remaining_accounts || [];

                if (remainingAccounts.length > 0) {
                  console.log(`[Threads Phase 2] ✅ Published to ${processingState.account_label || 'Threads'}`);
                  console.log(`[Threads Phase 2] Queueing ${remainingAccounts.length} remaining account(s): ${remainingAccounts.join(', ')}`);

                  // Reset post to pending status with only remaining accounts selected
                  await supabase
                    .from('scheduled_posts')
                    .update({
                      status: 'pending',
                      selected_accounts: {
                        ...post.selected_accounts,
                        threads: remainingAccounts
                      },
                      processing_state: null
                    })
                    .eq('id', post.id);

                  console.log(`✅ Post ${post.id} published to ${processingState.account_label || 'Threads'}, ${remainingAccounts.length} account(s) remaining`);
                } else {
                  // No remaining accounts - mark as fully posted
                  await supabase
                    .from('scheduled_posts')
                    .update({
                      status: 'posted',
                      posted_at: new Date().toISOString(),
                      post_results: [{ platform: 'threads', success: true, postId: result.id }],
                      processing_state: null
                    })
                    .eq('id', post.id);

                  console.log(`✅ Post ${post.id} published to Threads (all accounts completed)`);
                }
              } else {
                // Check attempt count
                const attempts = (processingState.attempts || 0) + 1;
                const maxAttempts = 30; // 30 cron runs = ~30 minutes with 1-minute intervals

                if (attempts >= maxAttempts) {
                  console.log(`Post ${post.id}: Max attempts reached, marking as failed`);
                  await supabase
                    .from('scheduled_posts')
                    .update({
                      status: 'failed',
                      error_message: 'Threads video processing timed out after 30 minutes',
                      processing_state: null
                    })
                    .eq('id', post.id);
                } else {
                  // Update attempt count
                  await supabase
                    .from('scheduled_posts')
                    .update({
                      processing_state: {
                        ...processingState,
                        attempts,
                        last_check: new Date().toISOString(),
                        status
                      }
                    })
                    .eq('id', post.id);

                  console.log(`[Threads Phase 2] Still processing (attempt ${attempts}/${maxAttempts}, status: ${status})`);
                }
              }

              continue; // Move to next post
            }

            // Handle Instagram Phase 2 processing
            if (!processingState.container_ids) {
              console.log(`Post ${post.id} has no container_ids (Instagram), marking as failed`);
              await supabase
                .from('scheduled_posts')
                .update({
                  status: 'failed',
                  error_message: 'Invalid processing state'
                })
                .eq('id', post.id);
              continue;
            }

            // Get the Instagram account, respecting selected_accounts if specified
            const { data: instagramAccounts } = await supabase
              .from('social_accounts')
              .select('*')
              .eq('user_id', post.user_id)
              .eq('platform', 'instagram')
              .eq('is_active', true);

            if (!instagramAccounts || instagramAccounts.length === 0) {
              throw new Error('Instagram account not found');
            }

            // Find the correct account based on selection
            let account;
            if (post.selected_accounts && post.selected_accounts['instagram']) {
              const selectedIds = post.selected_accounts['instagram'];
              account = instagramAccounts.find(acc => selectedIds.includes(acc.id));
              if (!account) {
                console.log('Selected Instagram account not found, falling back to first available');
                account = instagramAccounts[0];
              }
            } else {
              account = instagramAccounts[0];
            }
            const instagramClient = new InstagramClient({
              accessToken: account.access_token,
              userID: account.platform_user_id,
              appSecret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET
            });

            // Check if containers are ready
            const { allReady, statuses } = await instagramClient.checkCarouselContainersReady(
              processingState.container_ids
            );

            if (allReady) {
              console.log(`Post ${post.id}: All containers ready, publishing...`);

              // Get caption
              const content = cleanHtmlContent(post.platform_content?.instagram || post.content);

              // Publish the carousel
              const result = await instagramClient.publishCarouselFromContainers(
                processingState.container_ids,
                content
              );

              // Check if there are remaining accounts to process
              const remainingAccounts = processingState.remaining_accounts || [];

              if (remainingAccounts.length > 0) {
                console.log(`[Phase 2] ✅ Published to ${processingState.account_label || 'Instagram'}`);
                console.log(`[Phase 2] Queueing ${remainingAccounts.length} remaining account(s): ${remainingAccounts.join(', ')}`);

                // Reset post to pending status with only remaining accounts selected
                await supabase
                  .from('scheduled_posts')
                  .update({
                    status: 'pending',
                    selected_accounts: {
                      ...post.selected_accounts,
                      instagram: remainingAccounts
                    },
                    processing_state: null
                  })
                  .eq('id', post.id);

                console.log(`✅ Post ${post.id} published to ${processingState.account_label || 'Instagram'}, ${remainingAccounts.length} account(s) remaining`);
              } else {
                // No remaining accounts - mark as fully posted
                await supabase
                  .from('scheduled_posts')
                  .update({
                    status: 'posted',
                    posted_at: new Date().toISOString(),
                    post_results: [{ platform: 'instagram', success: true, postId: result.id }],
                    processing_state: null
                  })
                  .eq('id', post.id);

                console.log(`✅ Post ${post.id} published to Instagram (all accounts completed)`);
              }
            } else {
              // Check attempt count
              const attempts = (processingState.attempts || 0) + 1;
              const maxAttempts = 30; // 30 cron runs = ~30 minutes with 1-minute intervals

              if (attempts >= maxAttempts) {
                console.log(`Post ${post.id}: Max attempts reached, marking as failed`);
                await supabase
                  .from('scheduled_posts')
                  .update({
                    status: 'failed',
                    error_message: 'Instagram video processing timed out after 30 minutes',
                    processing_state: null
                  })
                  .eq('id', post.id);
              } else {
                // Update attempt count
                await supabase
                  .from('scheduled_posts')
                  .update({
                    processing_state: {
                      ...processingState,
                      attempts,
                      last_check: new Date().toISOString(),
                      statuses
                    }
                  })
                  .eq('id', post.id);

                console.log(`Post ${post.id}: Still processing (attempt ${attempts}/${maxAttempts})`);
              }
            }
          } catch (error) {
            console.error(`Error processing post ${post.id}:`, error);
            const errorMsg = error instanceof Error ? error.message : 'Processing error';
            const { error: updateError } = await supabase
              .from('scheduled_posts')
              .update({
                status: 'failed',
                error_message: errorMsg,
                processing_state: null
              })
              .eq('id', post.id);

            if (updateError) {
              console.error(`CRITICAL: Failed to mark processing post ${post.id} as failed:`, updateError);
              console.error(`Original error: ${errorMsg}`);
            } else {
              console.log(`✅ Marked processing post ${post.id} as failed: ${errorMsg}`);
            }
          }
        }
      } else {
        console.log('No posts in processing status');
      }
    } catch (phase2Error) {
      console.error('Error in phase 2 processing:', phase2Error);
    }

    // Find posts that are due to be posted
    const now = new Date().toISOString();
    console.log('Querying for posts due before:', now);
    
    // First, check for YouTube scheduled posts that have passed their publish time
    // These are already uploaded to YouTube with publishAt, we just need to update their status
    console.log('=== Checking for YouTube scheduled posts ===');

    // Get all pending posts scheduled before now, then filter for YouTube in JavaScript
    // This avoids the PostgreSQL JSONB contains syntax issues
    const { data: allPendingPosts, error: youtubeError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    console.log('All pending posts query:', {
      error: youtubeError,
      count: allPendingPosts?.length || 0
    });

    // Filter for YouTube posts with scheduled flag in JavaScript
    const youtubeScheduledPosts = allPendingPosts?.filter(post =>
      post.platforms?.includes('youtube') &&
      post.post_results?.some((result: any) =>
        result.platform === 'youtube' && result.scheduled === true
      )
    ) || [];

    console.log('YouTube scheduled posts after filtering:', {
      count: youtubeScheduledPosts.length,
      posts: youtubeScheduledPosts.map(p => ({
        id: p.id,
        scheduled_for: p.scheduled_for,
        has_post_results: !!p.post_results,
        post_results: p.post_results
      }))
    });

    if (!youtubeError && youtubeScheduledPosts.length > 0) {
      console.log(`Found ${youtubeScheduledPosts.length} YouTube scheduled posts to mark as posted`);

      for (const post of youtubeScheduledPosts) {
        // Update status to posted since YouTube handles the actual publishing
        const { error: updateError } = await supabase
          .from('scheduled_posts')
          .update({
            status: 'posted',
            posted_at: post.scheduled_for // Use scheduled time as posted time
          })
          .eq('id', post.id);

        if (updateError) {
          console.error(`Failed to update YouTube post ${post.id}:`, updateError);
          // Try to mark as failed so user can see something went wrong
          const { error: failedError } = await supabase
            .from('scheduled_posts')
            .update({
              status: 'failed',
              error_message: `YouTube video was scheduled but status update failed: ${updateError.message}`
            })
            .eq('id', post.id);

          if (failedError) {
            console.error(`CRITICAL: Could not mark YouTube post ${post.id} as failed either:`, failedError);
          }
        } else {
          console.log(`✅ Marked YouTube post ${post.id} as posted`);
        }
      }
    } else {
      console.log('No YouTube scheduled posts found or error occurred');
    }
    
    // Now get regular posts that need to be posted
    const { data: duePosts, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(10); // Process max 10 posts per run to avoid timeouts

    if (error) {
      console.error('Error fetching due posts:', error);
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    if (!duePosts || duePosts.length === 0) {
      console.log('No posts due for posting');
      return NextResponse.json({ 
        success: true, 
        message: 'No posts due for posting',
        processed: 0 
      });
    }

    console.log(`Found ${duePosts.length} posts due for posting`);

    const results = [];

    // Process each due post
    for (const post of duePosts) {
      // Skip if this is a YouTube scheduled post (already handled above)
      if (post.platforms.includes('youtube') && 
          post.post_results?.some((result: any) => 
            result.platform === 'youtube' && result.scheduled === true
          )) {
        console.log(`Skipping YouTube scheduled post ${post.id} - handled separately`);
        continue;
      }
      
      try {
        // Mark as posting to prevent duplicate processing
        const { error: postingError } = await supabase
          .from('scheduled_posts')
          .update({ status: 'posting' })
          .eq('id', post.id);

        if (postingError) {
          console.error(`Failed to mark post ${post.id} as posting:`, postingError);
          // Skip this post if we can't update its status
          results.push({
            postId: post.id,
            success: false,
            error: `Database error: ${postingError.message}`
          });
          continue;
        }

        console.log(`Processing post ${post.id}:`, post.content.slice(0, 50) + '...');

        // Get user's connected accounts for the platforms
        const { data: accounts, error: accountsError } = await supabase
          .from('social_accounts')
          .select('*')
          .eq('user_id', post.user_id)
          .eq('is_active', true)
          .in('platform', post.platforms);

        if (accountsError) {
          throw new Error(`Failed to get user accounts: ${accountsError.message}`);
        }

        if (!accounts || accounts.length === 0) {
          throw new Error('No connected accounts found for specified platforms');
        }

        // Create a mock request context for the posting service
        const postResults = [];
        let twoPhaseTriggered = false;

        // Post to each platform
        for (const platform of post.platforms) {
          // Skip YouTube since it's handled separately with native scheduling
          if (platform === 'youtube') {
            console.log('Skipping YouTube platform - handled via native scheduling');
            continue;
          }

          // Find accounts for this platform, respecting selected_accounts if specified
          let accountsToPost;
          if (post.selected_accounts && post.selected_accounts[platform]) {
            // User selected specific account(s) - use all selected accounts
            const selectedIds = post.selected_accounts[platform];
            accountsToPost = accounts.filter(acc =>
              acc.platform === platform && selectedIds.includes(acc.id)
            );
            if (accountsToPost.length === 0) {
              console.log(`Selected accounts not found for ${platform}, falling back to first available`);
              const fallbackAccount = accounts.find(acc => acc.platform === platform);
              accountsToPost = fallbackAccount ? [fallbackAccount] : [];
            }
          } else {
            // No specific selection - use primary account or first available
            const platformAccounts = accounts.filter(acc => acc.platform === platform);
            const primaryAccount = platformAccounts.find(acc => acc.is_primary);
            accountsToPost = primaryAccount ? [primaryAccount] : platformAccounts.slice(0, 1);
          }

          if (accountsToPost.length === 0) {
            postResults.push({
              platform,
              success: false,
              error: `${platform} account not connected`
            });
            continue;
          }

          // Post to each selected account
          for (const account of accountsToPost) {
            const platformLabel = account.account_label || account.username || platform;

          try {
            const rawContent = post.platform_content?.[platform] || post.content;
            const content = cleanHtmlContent(rawContent);

            console.log(`=== ${platform.toUpperCase()} CONTENT DEBUG ===`);
            console.log('Raw content:', JSON.stringify(rawContent));
            console.log('Cleaned content:', JSON.stringify(content));
            console.log('Content length:', content.length);
            console.log('First 10 chars:', JSON.stringify(content.substring(0, 10)));

            let result;

            // Post to platform using direct function calls (no HTTP)
            switch (platform) {
              case 'facebook':
                result = await postToFacebookDirect(content, account, post.media_urls, {
                  isStory: post.facebook_as_story || false,
                  isReel: post.facebook_as_reel || false,
                  userId: post.user_id,
                  supabase: supabase
                });
                break;

              case 'bluesky':
                result = await postToBlueskyDirect(content, account, post.media_urls);
                break;

              case 'instagram':
                result = await postToInstagramDirect(content, account, post.media_urls, {
                  isStory: post.instagram_as_story || false,
                  isReel: post.instagram_as_reel || false
                });
                break;

              case 'linkedin':
                result = await postToLinkedInDirect(content, account, post.media_urls);
                break;

              case 'twitter':
                result = await postToTwitterDirect(content, account, post.media_urls);
                break;

              case 'threads':
                // Clean HTML from thread posts if they exist
                const threadPosts = post.thread_posts
                  ? (post.thread_posts as string[]).map(text => cleanHtmlContent(text))
                  : undefined;

                result = await postToThreadsDirect(content, account, post.media_urls, supabase, {
                  threadsMode: post.threads_mode || undefined,
                  threadPosts: threadPosts,
                  threadsThreadMedia: post.threads_thread_media || undefined
                });
                break;

              case 'pinterest':
                result = await postToPinterestDirect(content, account, post.media_urls);
                break;

              case 'tiktok':
                result = await postToTikTokDirect(content, account, post.media_urls);
                break;

              default:
                postResults.push({
                  platform,
                  success: false,
                  error: `${platform} posting not implemented yet`
                });
                continue;
            }

            // Handle two-phase processing for Instagram carousels and Threads videos
            if ((result as any).twoPhase) {
              const twoPhaseResult = result as any;
              const isThreads = twoPhaseResult.platform === 'threads';
              const isInstagram = twoPhaseResult.platform === 'instagram' || !twoPhaseResult.platform;

              console.log(`[Two-Phase] ${isThreads ? 'Threads video' : 'Instagram carousel'} needs processing for ${platformLabel}`);

              // Calculate remaining accounts to process after this one
              const currentIndex = accountsToPost.indexOf(account);
              const remainingAccounts = accountsToPost.slice(currentIndex + 1).map(a => a.id);

              console.log(`[Two-Phase] Current account: ${account.id} (${platformLabel})`);
              console.log(`[Two-Phase] Remaining accounts: ${remainingAccounts.length > 0 ? remainingAccounts.join(', ') : 'none'}`);

              // Build processing state based on platform
              const processingState: any = {
                platform: isThreads ? 'threads' : 'instagram',
                account_id: account.id,
                account_label: platformLabel,
                remaining_accounts: remainingAccounts,
                phase: 'waiting_for_containers',
                attempts: 0,
                created_at: new Date().toISOString()
              };

              // Add platform-specific container IDs
              if (isThreads) {
                processingState.container_id = twoPhaseResult.containerId; // Single Threads video uses containerId
              } else {
                processingState.container_ids = twoPhaseResult.containerIds; // Instagram carousel uses containerIds array
              }

              // Update post to processing status with container IDs and account tracking
              const { error: processingError } = await supabase
                .from('scheduled_posts')
                .update({
                  status: 'processing',
                  processing_state: processingState
                })
                .eq('id', post.id);

              if (processingError) {
                console.error(`Failed to set processing status:`, processingError);
                postResults.push({
                  platform,
                  success: false,
                  error: `Failed to save processing state: ${processingError.message}`
                });
              } else {
                // Return early from this post - it will be processed in the next cron run
                results.push({
                  postId: post.id,
                  success: true,
                  platforms: [],
                  message: isThreads
                    ? 'Threads video container created, waiting for processing'
                    : 'Instagram carousel containers created, waiting for video processing'
                });

                // Set flag and break to skip success/failed check
                twoPhaseTriggered = true;
                break;
              }
              continue;
            }

            // Handle async Threads thread processing (queue-based)
            if ((result as any).async && (result as any).threadJobId) {
              const asyncResult = result as any;

              console.log(`[Async Thread] Job created: ${asyncResult.threadJobId} for ${platformLabel}`);

              // Calculate remaining accounts to process after this one
              const currentIndex = accountsToPost.indexOf(account);
              const remainingAccounts = accountsToPost.slice(currentIndex + 1).map(a => a.id);

              // Store job ID in scheduled_post for status tracking
              const processingState: any = {
                platform: 'threads_thread',
                thread_job_id: asyncResult.threadJobId,
                account_id: account.id,
                account_label: platformLabel,
                remaining_accounts: remainingAccounts,
                phase: 'queued',
                created_at: new Date().toISOString()
              };

              // Update post to processing status
              await supabase
                .from('scheduled_posts')
                .update({
                  status: 'processing',
                  processing_state: processingState
                })
                .eq('id', post.id);

              // Also link the scheduled_post_id to the thread job
              await supabase
                .from('thread_jobs')
                .update({ scheduled_post_id: post.id })
                .eq('id', asyncResult.threadJobId);

              console.log(`[Async Thread] Scheduled post ${post.id} set to processing, job queued`);

              // Return early - job will be processed asynchronously via QStash
              results.push({
                postId: post.id,
                success: true,
                platforms: [],
                message: `Threads thread queued for async processing (${asyncResult.threadJobId})`
              });

              // Set flag and break to skip success/failed check
              twoPhaseTriggered = true;
              break;
            }

            postResults.push({
              platform: platformLabel,
              success: true,
              postId: (result as any).postId || (result as any).id || (result as any).uri,
              data: result
            });

          } catch (error) {
            console.error(`Error posting to ${platformLabel} (${platform}):`, error);
            
            // Include URL info in error for debugging
            const debugUrl = process.env.VERCEL_URL 
              ? `VERCEL_URL: ${process.env.VERCEL_URL}` 
              : 'Using localhost';
            
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            postResults.push({
              platform: platformLabel,
              success: false,
              error: `${errorMsg} (${debugUrl})`
            });
          }
          } // End of accountsToPost loop
        } // End of platforms loop

        // Skip success/failed check if two-phase processing was triggered
        if (twoPhaseTriggered) {
          continue; // Move to next post
        }

        // Check if all posts were successful
        const successful = postResults.filter(r => r.success);
        const failed = postResults.filter(r => !r.success);

        if (successful.length > 0 && failed.length === 0) {
          // All successful - mark as posted
          // Extract thumbnail URL from results if available (for videos/reels/stories)
          let platformMediaUrl = null;
          for (const result of postResults) {
            // Check if result has data property and thumbnailUrl (type-safe check)
            const resultData = result.data as any;
            if (resultData && resultData.thumbnailUrl) {
              platformMediaUrl = resultData.thumbnailUrl;
              console.log(`Found thumbnail URL for ${result.platform}:`, platformMediaUrl);
              break; // Use first thumbnail found
            }
          }

          const updateData: any = {
            status: 'posted',
            posted_at: new Date().toISOString(),
            post_results: postResults
          };

          // Add platform_media_url if thumbnail was found
          if (platformMediaUrl) {
            updateData.platform_media_url = platformMediaUrl;

            // For YouTube videos, also update media_urls if it's empty
            // This ensures the video thumbnail shows in the UI
            if (!post.media_urls || post.media_urls.length === 0) {
              const isYouTubePost = post.platforms.includes('youtube');
              if (isYouTubePost) {
                updateData.media_urls = [platformMediaUrl];
                console.log('Setting media_urls for YouTube post:', platformMediaUrl);
              }
            }
          }

          const { error: postedError } = await supabase
            .from('scheduled_posts')
            .update(updateData)
            .eq('id', post.id);

          if (postedError) {
            console.error(`Failed to mark post ${post.id} as posted:`, postedError);
            // Post succeeded on platforms but database update failed - log but continue
            // This is important to track so user can see something went wrong
          }

          // Increment posts usage counter
          try {
            await supabase.rpc('increment_usage', {
              user_uuid: post.user_id,
              resource: 'posts',
              increment: 1
            });
          } catch (usageError) {
            console.error('Failed to increment usage counter:', usageError);
          }

          // Clean up uploaded media files if all successful
          // IMPORTANT: Don't cleanup if TikTok, Pinterest, or Bluesky was posted
          // - TikTok needs time to download the video
          // - Pinterest needs permanent URLs for thumbnails (Pinterest API URLs expire)
          // - Bluesky needs time to fetch and process media from URLs
          const postedToTikTok = post.platforms.includes('tiktok');
          const postedToPinterest = post.platforms.includes('pinterest');
          const postedToBluesky = post.platforms.includes('bluesky');
          const shouldSkipCleanup = postedToTikTok || postedToPinterest || postedToBluesky;

          if (post.media_urls && post.media_urls.length > 0 && !shouldSkipCleanup) {
            try {
              await cleanupMediaFiles(post.media_urls);
            } catch (cleanupError) {
              console.error('Media cleanup error:', cleanupError);
            }
          } else if (shouldSkipCleanup) {
            const reasons = [];
            if (postedToTikTok) reasons.push('TikTok needs time to download');
            if (postedToPinterest) reasons.push('Pinterest needs permanent URLs');
            if (postedToBluesky) reasons.push('Bluesky needs time to fetch media');
            console.log(`Skipping media cleanup - ${reasons.join(', ')}`);
          }

        } else {
          // Some or all failed - mark as failed
          const errorMessage = failed.map(f => `${f.platform}: ${f.error}`).join('; ');
          const { error: failedError } = await supabase
            .from('scheduled_posts')
            .update({
              status: 'failed',
              error_message: errorMessage,
              post_results: postResults
            })
            .eq('id', post.id);

          if (failedError) {
            console.error(`CRITICAL: Failed to mark post ${post.id} as failed in database:`, failedError);
            console.error(`Original error was: ${errorMessage}`);
            // This is critical - the post failed but we can't record it
          }
        }

        results.push({
          postId: post.id,
          success: successful.length > 0,
          platforms: successful.map(s => s.platform),
          errors: failed.map(f => `${f.platform}: ${f.error}`)
        });

      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);

        // Mark as failed
        const errorMsg = error instanceof Error ? error.message : 'Processing error';
        const { error: failedError } = await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            error_message: errorMsg
          })
          .eq('id', post.id);

        if (failedError) {
          console.error(`CRITICAL: Failed to mark post ${post.id} as failed in database:`, failedError);
          console.error(`Original error was: ${errorMsg}`);
        }

        results.push({
          postId: post.id,
          success: false,
          error: errorMsg
        });
      }
    }

    console.log('=== Processing Complete ===');
    console.log('Results:', results);

    return NextResponse.json({
      success: true,
      processed: duePosts.length,
      results
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions section removed - now using direct function calls from cron-service.ts

// Helper function to clean HTML content (same as PostingService)
function cleanHtmlContent(content: string): string {
  // Handle null/undefined content
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  let cleaned = content;
  
  // First, decode any HTML entities that might have been double-encoded
  // This handles cases like &lt;p&gt;text&lt;/p&gt; -> <p>text</p>
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Now convert HTML tags to line breaks
  cleaned = cleaned
    .replace(/<\/p>/gi, '\n\n') // End of paragraph gets double line break
    .replace(/<br\s*\/?>/gi, '\n') // Line breaks get single line break
    .replace(/<\/div>/gi, '\n') // Divs often act as line breaks
    .replace(/<\/li>/gi, '\n') // List items get line breaks
    
  // Replace remaining HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // Remove remaining HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Clean up extra whitespace
  cleaned = cleaned
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Max double line breaks
    .replace(/^\s+|\s+$/g, '') // Trim start/end
    .replace(/[ \t]+/g, ' '); // Normalize spaces

  return cleaned;
}

// Helper function to clean up media files after successful posting
async function cleanupMediaFiles(mediaUrls: any[]) {
  for (const mediaItem of mediaUrls) {
    try {
      // Extract URL string from object if needed
      let url: string;
      if (typeof mediaItem === 'string') {
        url = mediaItem;
      } else if (mediaItem && typeof mediaItem === 'object' && mediaItem.url) {
        url = mediaItem.url;
        // Keep thumbnails - they're needed for display in the dashboard
        // Thumbnails are small JPG files so storage impact is minimal
        if (mediaItem.thumbnailUrl) {
          console.log('Keeping thumbnail for display:', mediaItem.thumbnailUrl);
        }
      } else {
        console.error('Invalid media item format:', mediaItem);
        continue;
      }

      await cleanupSingleUrl(url);
    } catch (error) {
      console.error('Error cleaning up file:', mediaItem, error);
    }
  }
}

// Helper to cleanup a single URL
async function cleanupSingleUrl(url: string) {
  // Handle R2 URLs (new format)
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    const key = url.replace(`${R2_PUBLIC_URL}/`, '');
    await r2Storage.delete(key);
    console.log(`Deleted R2 file: ${key}`);
    return;
  }

  // Handle legacy Supabase URLs (for old posts)
  const urlParts = url.split('/storage/v1/object/public/post-media/');
  if (urlParts.length === 2) {
    console.log(`Skipping legacy Supabase URL: ${url}`);
    // Note: Old Supabase files will need manual cleanup or a migration script
  }
}

// Export GET handler - called by QStash or manual triggers
export async function GET(request: NextRequest) {
  return processScheduledPosts(request);
}

// Export POST handler - called by QStash
export async function POST(request: NextRequest) {
  return processScheduledPosts(request);
}