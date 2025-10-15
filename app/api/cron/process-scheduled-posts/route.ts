import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PostingService } from '@/lib/posting/service';
import { Receiver } from '@upstash/qstash';
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

// This endpoint will be called by QStash every minute
export async function GET(request: NextRequest) {
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

    // Find posts that are due to be posted
    const now = new Date().toISOString();
    console.log('Querying for posts due before:', now);
    
    // First, check for YouTube scheduled posts that have passed their publish time
    // These are already uploaded to YouTube with publishAt, we just need to update their status
    const { data: youtubeScheduledPosts, error: youtubeError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .contains('platforms', ['youtube'])
      .lte('scheduled_for', now);
    
    if (!youtubeError && youtubeScheduledPosts && youtubeScheduledPosts.length > 0) {
      // Filter to only YouTube-scheduled posts (those with post_results indicating scheduled)
      const youtubePostsToUpdate = youtubeScheduledPosts.filter(post => 
        post.post_results?.some((result: any) => 
          result.platform === 'youtube' && result.scheduled === true
        )
      );
      
      if (youtubePostsToUpdate.length > 0) {
        console.log(`Found ${youtubePostsToUpdate.length} YouTube scheduled posts to mark as posted`);
        
        for (const post of youtubePostsToUpdate) {
          // Update status to posted since YouTube handles the actual publishing
          await supabase
            .from('scheduled_posts')
            .update({ 
              status: 'posted',
              posted_at: post.scheduled_for // Use scheduled time as posted time
            })
            .eq('id', post.id);
          
          console.log(`Marked YouTube post ${post.id} as posted`);
        }
      }
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
        await supabase
          .from('scheduled_posts')
          .update({ status: 'posting' })
          .eq('id', post.id);

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

        // Post to each platform
        for (const platform of post.platforms) {
          // Skip YouTube since it's handled separately with native scheduling
          if (platform === 'youtube') {
            console.log('Skipping YouTube platform - handled via native scheduling');
            continue;
          }
          
          const account = accounts.find(acc => acc.platform === platform);
          
          if (!account) {
            postResults.push({
              platform,
              success: false,
              error: `${platform} account not connected`
            });
            continue;
          }

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
                result = await postToFacebookDirect(content, account, post.media_urls);
                break;

              case 'bluesky':
                result = await postToBlueskyDirect(content, account, post.media_urls);
                break;

              case 'instagram':
                result = await postToInstagramDirect(content, account, post.media_urls);
                break;

              case 'linkedin':
                result = await postToLinkedInDirect(content, account, post.media_urls);
                break;

              case 'twitter':
                result = await postToTwitterDirect(content, account, post.media_urls);
                break;

              case 'threads':
                result = await postToThreadsDirect(content, account, post.media_urls);
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

            postResults.push({
              platform,
              success: true,
              postId: (result as any).postId || (result as any).id || (result as any).uri,
              data: result
            });

          } catch (error) {
            console.error(`Error posting to ${platform}:`, error);
            
            // Include URL info in error for debugging
            const debugUrl = process.env.VERCEL_URL 
              ? `VERCEL_URL: ${process.env.VERCEL_URL}` 
              : 'Using localhost';
            
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            
            postResults.push({
              platform,
              success: false,
              error: `${errorMsg} (${debugUrl})`
            });
          }
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

          await supabase
            .from('scheduled_posts')
            .update(updateData)
            .eq('id', post.id);

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
              await cleanupMediaFiles(post.media_urls, supabase);
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
          await supabase
            .from('scheduled_posts')
            .update({
              status: 'failed',
              error_message: errorMessage,
              post_results: postResults
            })
            .eq('id', post.id);
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
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Processing error'
          })
          .eq('id', post.id);

        results.push({
          postId: post.id,
          success: false,
          error: error instanceof Error ? error.message : 'Processing error'
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
async function cleanupMediaFiles(mediaUrls: string[], supabase: any) {
  for (const url of mediaUrls) {
    try {
      const urlParts = url.split('/storage/v1/object/public/post-media/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        await supabase.storage.from('post-media').remove([filePath]);
      }
    } catch (error) {
      console.error('Error cleaning up file:', url, error);
    }
  }
}