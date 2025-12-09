import { BlueskyService } from '@/lib/bluesky/service';
import { FacebookService } from '@/lib/facebook/service';
import { InstagramService } from '@/lib/instagram/service';
import { LinkedInService } from '@/lib/linkedin/service';
import { TwitterService } from '@/lib/twitter/service';
import { ThreadsService } from '@/lib/threads/service';
import { PinterestService, formatPinterestContent } from '@/lib/pinterest/service';
import { TikTokService } from '@/lib/tiktok/service';
import { fetchWithTimeout, TIMEOUT } from '@/lib/utils/fetch-with-timeout';
import { retryWithBackoff, PLATFORM_RETRY_CONFIG } from '@/lib/utils/retry-with-backoff';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Refresh Threads token (cron version with service role client)
 */
async function refreshThreadsTokenCron(account: any, supabase: SupabaseClient): Promise<{
  success: boolean;
  newToken?: string;
  error?: string;
}> {
  try {
    console.log('Attempting to refresh Threads token for account:', account.id);

    // Check if token is at least 1 day old (Threads requirement)
    const lastUpdated = account.updated_at ? new Date(account.updated_at) : null;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (lastUpdated && lastUpdated > oneDayAgo) {
      console.log('Token is less than 24 hours old, cannot refresh yet');
      return {
        success: false,
        error: 'Token must be at least 24 hours old to refresh'
      };
    }

    // Threads API token refresh endpoint
    const refreshUrl = 'https://graph.threads.net/refresh_access_token';
    const params = new URLSearchParams({
      grant_type: 'th_refresh_token',
      access_token: account.access_token
    });

    console.log('Refreshing token with grant_type: th_refresh_token');
    const response = await fetchWithTimeout(`${refreshUrl}?${params}`, {
      method: 'GET',
      timeout: TIMEOUT.DEFAULT
    });

    const responseText = await response.text();
    console.log('Refresh response status:', response.status);

    if (!response.ok) {
      console.error('Failed to refresh token:', responseText);

      try {
        const errorData = JSON.parse(responseText);
        console.error('Error details:', errorData);

        if (errorData.error?.code === 190 ||
            errorData.error?.message?.includes('Invalid OAuth') ||
            errorData.error?.message?.includes('Error validating access token')) {
          return {
            success: false,
            error: 'Token is invalid. Please reconnect your Threads account.'
          };
        }
      } catch (e) {
        // Not JSON, use raw text
      }

      return {
        success: false,
        error: 'Token refresh failed. Please reconnect your account.'
      };
    }

    const data = JSON.parse(responseText);
    const newToken = data.access_token;
    const expiresIn = data.expires_in || 5183944; // Default to ~60 days

    if (!newToken) {
      console.error('No access token in refresh response:', data);
      return {
        success: false,
        error: 'No new token received from refresh'
      };
    }

    // Update the token in the database using service role client
    const { error: updateError } = await supabase
      .from('social_accounts')
      .update({
        access_token: newToken,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('Failed to update token in database:', updateError);
      return {
        success: false,
        error: 'Failed to save refreshed token'
      };
    }

    console.log('Successfully refreshed Threads token, expires in', Math.floor(expiresIn / 86400), 'days');
    return { success: true, newToken };
  } catch (error) {
    console.error('Error refreshing Threads token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function postToFacebookDirect(
  content: string,
  account: any,
  mediaUrls?: string[],
  options?: {
    isStory?: boolean;
    isReel?: boolean;
    userId?: string;
    supabase?: SupabaseClient;
  }
) {
  console.log('=== DIRECT FACEBOOK POST ===');
  console.log('Content:', content);
  console.log('Page ID:', account.platform_user_id);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);
  console.log('Is story:', options?.isStory || false);
  console.log('Is reel:', options?.isReel || false);

  try {
    // Normalize mediaUrls - extract URL strings from objects if needed
    const normalizedMediaUrls: string[] | undefined = mediaUrls?.map(item => {
      if (typeof item === 'string') {
        return item;
      } else if (item && typeof item === 'object' && (item as any).url) {
        return (item as any).url;
      } else {
        console.error('[Facebook] Invalid media URL format:', item);
        return '';
      }
    }).filter(url => url !== '');

    // Wrap API calls with retry logic for transient errors
    const result = await retryWithBackoff(async () => {
      const facebookService = new FacebookService();

      // Check if this is a story or reel post
      if (options?.isStory && normalizedMediaUrls && normalizedMediaUrls.length > 0) {
        // Facebook Story
        if (!options.userId || !options.supabase) {
          throw new Error('userId and supabase client are required for Facebook stories');
        }

        const mediaUrl = normalizedMediaUrls[0];
        const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
        const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));
        const mediaType = isVideo ? 'video' : 'photo';

        console.log(`Creating Facebook ${mediaType} story`);
        return await facebookService.createStoryPost(
          account.platform_user_id,
          account.access_token,
          mediaUrl,
          mediaType,
          options.supabase,
          options.userId
        );
      } else if (options?.isReel && normalizedMediaUrls && normalizedMediaUrls.length > 0) {
        // Facebook Reel
        if (!options.userId || !options.supabase) {
          throw new Error('userId and supabase client are required for Facebook reels');
        }

        const videoUrl = normalizedMediaUrls[0];
        console.log('Creating Facebook Reel');
        return await facebookService.createReelPost(
          account.platform_user_id,
          account.access_token,
          content,
          videoUrl,
          options.supabase,
          options.userId
        );
      } else if (!normalizedMediaUrls || normalizedMediaUrls.length === 0) {
        // Text-only post
        console.log('Creating text-only Facebook post');
        return await facebookService.createPost(
          account.platform_user_id,
          account.access_token,
          content
        );
      } else if (normalizedMediaUrls.length === 1) {
        // Single media post (feed)
        const mediaUrl = normalizedMediaUrls[0];
        const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
        const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));

        if (isVideo) {
          console.log('Creating Facebook video post');
          return await facebookService.createVideoPost(
            account.platform_user_id,
            account.access_token,
            content,
            mediaUrl
          );
        } else {
          console.log('Creating Facebook photo post');
          return await facebookService.createPhotoPost(
            account.platform_user_id,
            account.access_token,
            content,
            mediaUrl
          );
        }
      } else {
        // Multiple photos (carousel)
        const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
        const imageUrls = normalizedMediaUrls.filter(url =>
          !videoExtensions.some(ext => url.toLowerCase().includes(ext))
        );

        if (imageUrls.length === 0) {
          throw new Error('Facebook does not support multiple videos in a single post');
        }

        console.log(`Creating Facebook carousel post with ${imageUrls.length} images`);
        return await facebookService.createCarouselPost(
          account.platform_user_id,
          account.access_token,
          content,
          imageUrls
        );
      }
    }, {
      ...PLATFORM_RETRY_CONFIG,
      onRetry: (attempt, error, delay) => {
        console.log(JSON.stringify({
          event: 'facebook_post_retry',
          attempt,
          error: error.message,
          delay_ms: Math.round(delay),
          account_id: account.id
        }));
      }
    });

    const resultWithThumbnail = result as any;
    return {
      success: true,
      id: result.id,
      thumbnailUrl: resultWithThumbnail.thumbnailUrl, // Include thumbnail URL if available
      message: 'Posted to Facebook successfully'
    };
  } catch (error) {
    console.error('Facebook posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function postToBlueskyDirect(content: string, account: any, mediaUrls?: any[]) {
  console.log('=== DIRECT BLUESKY POST ===');
  console.log('Content:', JSON.stringify(content));
  console.log('Content length:', content.length);
  console.log('First 10 chars:', JSON.stringify(content.substring(0, 10)));
  console.log('Content type:', typeof content);
  console.log('Media URLs (raw):', JSON.stringify(mediaUrls));
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  // Make absolutely sure content is a string
  const textContent = String(content);
  console.log('Text content after String():', JSON.stringify(textContent));

  // Normalize mediaUrls - extract URL strings from objects if needed
  const normalizedMediaUrls: string[] | undefined = mediaUrls?.map(item => {
    if (typeof item === 'string') {
      return item;
    } else if (item && typeof item === 'object' && item.url) {
      console.log('[Bluesky] Extracting URL from object:', item.url);
      return item.url;
    } else {
      console.error('[Bluesky] Invalid media URL format:', item);
      return '';
    }
  }).filter(url => url !== '');

  console.log('Media URLs (normalized):', normalizedMediaUrls);

  // Wrap API call with retry logic for transient errors
  const result = await retryWithBackoff(async () => {
    const blueskyService = new BlueskyService();
    return await blueskyService.createPost(
      account.access_token, // identifier stored in access_token
      account.access_secret, // password stored in access_secret
      textContent,
      normalizedMediaUrls
    );
  }, {
    ...PLATFORM_RETRY_CONFIG,
    onRetry: (attempt, error, delay) => {
      console.log(JSON.stringify({
        event: 'bluesky_post_retry',
        attempt,
        error: error.message,
        delay_ms: Math.round(delay),
        account_id: account.id
      }));
    }
  });

  return {
    success: true,
    uri: result.uri,
    cid: result.cid,
    message: 'Posted to Bluesky successfully'
  };
}

export async function postToInstagramDirect(
  content: string,
  account: any,
  mediaUrls?: any[],
  options?: {
    isStory?: boolean;
    isReel?: boolean;
  }
) {
  console.log('=== DIRECT INSTAGRAM POST ===');
  console.log('Content:', content);
  console.log('Account ID:', account.platform_user_id);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);
  console.log('Is story:', options?.isStory || false);
  console.log('Is reel:', options?.isReel || false);

  try {
    // Normalize mediaUrls - extract URL strings from objects if needed
    const normalizedMediaUrls: string[] | undefined = mediaUrls?.map(item => {
      if (typeof item === 'string') {
        return item;  // Already a string
      } else if (item && typeof item === 'object' && item.url) {
        return item.url;  // Extract URL from object
      } else {
        console.error('[Instagram] Invalid media URL format:', item);
        return '';  // Return empty string for invalid items
      }
    }).filter(url => url !== '');  // Remove any empty strings

    console.log('[Instagram] Normalized media URLs:', normalizedMediaUrls);

    if (!normalizedMediaUrls || normalizedMediaUrls.length === 0) {
      throw new Error('Instagram posts require at least one media file');
    }

    // Check if this is a carousel with videos (needs two-phase processing)
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    const isCarousel = normalizedMediaUrls.length >= 2 && !options?.isStory && !options?.isReel;
    const hasVideos = normalizedMediaUrls.some(url =>
      videoExtensions.some(ext => url.toLowerCase().includes(ext))
    );

    if (isCarousel && hasVideos) {
      // Use two-phase processing for carousels with videos
      console.log('[Instagram] Using two-phase processing for carousel with videos');

      const { InstagramClient } = await import('@/lib/instagram/client');
      const instagramClient = new InstagramClient({
        accessToken: account.access_token,
        userID: account.platform_user_id,
        appSecret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET
      });

      // Prepare media items with type detection
      const mediaItems = normalizedMediaUrls.map(url => ({
        url,
        isVideo: videoExtensions.some(ext => url.toLowerCase().includes(ext))
      }));

      // Phase 1: Create containers only
      const { containerIds } = await instagramClient.createCarouselContainersOnly(mediaItems);

      // Return special result indicating two-phase processing
      return {
        success: true,
        twoPhase: true,
        containerIds,
        message: 'Carousel containers created, waiting for video processing'
      };
    }

    // Standard single-phase processing for non-video carousels or single posts
    // Wrap API call with retry logic for transient errors
    const result = await retryWithBackoff(async () => {
      const instagramService = new InstagramService({
        accessToken: account.access_token,
        userID: account.platform_user_id,
        appSecret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET
      });

      return await instagramService.createPost({
        caption: content,
        mediaUrls: normalizedMediaUrls,
        isStory: options?.isStory,
        isReel: options?.isReel
      });
    }, {
      ...PLATFORM_RETRY_CONFIG,
      onRetry: (attempt, error, delay) => {
        console.log(JSON.stringify({
          event: 'instagram_post_retry',
          attempt,
          error: error.message,
          delay_ms: Math.round(delay),
          account_id: account.id
        }));
      }
    });

    return {
      success: true,
      id: result.id,
      message: 'Posted to Instagram successfully'
    };
  } catch (error) {
    console.error('Instagram posting error:', error);
    throw error;
  }
}

export async function postToLinkedInDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT LINKEDIN POST ===');
  console.log('Content:', content);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  try {
    // Wrap API calls with retry logic for transient errors
    const result = await retryWithBackoff(async () => {
      const linkedInService = new LinkedInService(account.access_token, account.user_id);

      if (mediaUrls && mediaUrls.length > 0) {
        // LinkedIn only supports one media item per post
        const mediaUrl = mediaUrls[0];
        const mediaResponse = await fetch(mediaUrl);
        const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());
        const mimeType = mediaResponse.headers.get('content-type') || 'image/jpeg';

        // Detect if it's a video or image
        const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
        const isVideo = mimeType.startsWith('video/') ||
                        videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));

        if (isVideo) {
          console.log('LinkedIn: Detected video, using video upload API');
          return await linkedInService.postWithVideo(content, mediaBuffer, mimeType);
        } else {
          console.log('LinkedIn: Detected image, using image upload API');
          return await linkedInService.postWithImage(content, mediaBuffer, mimeType);
        }
      } else {
        // Text-only post
        return await linkedInService.shareContent({ text: content });
      }
    }, {
      ...PLATFORM_RETRY_CONFIG,
      onRetry: (attempt, error, delay) => {
        console.log(JSON.stringify({
          event: 'linkedin_post_retry',
          attempt,
          error: error.message,
          delay_ms: Math.round(delay),
          account_id: account.id
        }));
      }
    });

    return {
      success: true,
      id: result.id,
      message: 'Posted to LinkedIn successfully'
    };
  } catch (error) {
    console.error('LinkedIn posting error:', error);
    throw error;
  }
}

export async function postToTwitterDirect(content: string, account: any, mediaUrls?: any[]) {
  console.log('=== DIRECT TWITTER POST ===');
  console.log('Content:', content);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  try {
    // Extract thumbnail URL from the first video media object (if any)
    let thumbnailUrl: string | undefined;
    if (mediaUrls && mediaUrls.length > 0) {
      for (const item of mediaUrls) {
        if (item && typeof item === 'object' && item.thumbnailUrl) {
          thumbnailUrl = item.thumbnailUrl;
          console.log('[Twitter] Found video thumbnail:', thumbnailUrl);
          break;
        }
      }
    }

    // Normalize mediaUrls - extract URL strings from objects if needed
    const normalizedMediaUrls: string[] | undefined = mediaUrls?.map(item => {
      if (typeof item === 'string') {
        return item;  // Already a string
      } else if (item && typeof item === 'object' && item.url) {
        return item.url;  // Extract URL from object
      } else {
        console.error('[Twitter] Invalid media URL format:', item);
        return '';  // Return empty string for invalid items
      }
    }).filter(url => url !== '');  // Remove any empty strings

    console.log('[Twitter] Normalized media URLs:', normalizedMediaUrls);

    // Wrap API calls with retry logic for transient errors
    const result = await retryWithBackoff(async () => {
      const twitterService = new TwitterService({
        accessToken: account.access_token,
        accessSecret: account.access_secret
      });

      if (normalizedMediaUrls && normalizedMediaUrls.length > 0) {
        // Upload media first
        const mediaIds: string[] = [];

        for (const mediaUrl of normalizedMediaUrls.slice(0, 4)) { // Twitter allows max 4 images
          const mediaResponse = await fetch(mediaUrl);
          const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());
          const mimeType = mediaResponse.headers.get('content-type') || 'image/jpeg';

          const mediaId = await twitterService.uploadMedia(mediaBuffer, mimeType);
          mediaIds.push(mediaId);
        }

        // Post with media
        return await twitterService.postTweet(content, mediaIds);
      } else {
        // Text-only tweet
        return await twitterService.postTweet(content);
      }
    }, {
      ...PLATFORM_RETRY_CONFIG,
      onRetry: (attempt, error, delay) => {
        console.log(JSON.stringify({
          event: 'twitter_post_retry',
          attempt,
          error: error.message,
          delay_ms: Math.round(delay),
          account_id: account.id
        }));
      }
    });

    return {
      success: true,
      id: result.id,
      thumbnailUrl, // Include thumbnail URL for video posts
      message: 'Posted to Twitter successfully'
    };
  } catch (error) {
    console.error('Twitter posting error:', error);
    throw error;
  }
}

export async function postToThreadsDirect(
  content: string,
  account: any,
  mediaUrls?: string[],
  supabase?: SupabaseClient,
  threadData?: { threadsMode?: string; threadPosts?: string[]; threadsThreadMedia?: string[] },
  userId?: string
) {
  console.log('=== DIRECT THREADS POST ===');
  console.log('Content:', content);
  console.log('Thread data:', threadData);
  console.log('Account details:', {
    platform_user_id: account.platform_user_id,
    username: account.username,
    has_token: !!account.access_token,
    token_length: account.access_token?.length,
    token_preview: account.access_token ? `${account.access_token.substring(0, 20)}...` : 'null',
    expires_at: account.expires_at
  });

  try {
    // Check if token needs refresh
    let accessToken = account.access_token;

    if (account.expires_at) {
      const expiryDate = new Date(account.expires_at);
      const now = new Date();
      const isExpired = expiryDate <= now;
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiresSoon = expiryDate <= sevenDaysFromNow;

      console.log('Token expiry check:', {
        expires_at: account.expires_at,
        isExpired,
        expiresSoon,
        daysUntilExpiry: Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      });

      if (isExpired || expiresSoon) {
        console.log('Token expired or expiring soon, attempting refresh...');

        if (!supabase) {
          throw new Error('Supabase client required for token refresh');
        }

        const { success, newToken, error } = await refreshThreadsTokenCron(account, supabase);

        if (success && newToken) {
          console.log('Token refreshed successfully');
          accessToken = newToken;
        } else {
          console.error('Token refresh failed:', error);
          if (isExpired) {
            // Mark account as inactive so user knows to reconnect
            if (supabase) {
              await supabase
                .from('social_accounts')
                .update({
                  is_active: false,
                  updated_at: new Date().toISOString()
                })
                .eq('id', account.id);
              console.warn(`Marked Threads account ${account.id} as inactive due to expired token`);
            }
            throw new Error(`Threads token expired and refresh failed: ${error}. Please reconnect your Threads account in Settings.`);
          }
          // If not expired yet, log warning but try with existing token
          // Also log structured warning for monitoring
          console.warn(JSON.stringify({
            event: 'threads_token_refresh_failed',
            account_id: account.id,
            username: account.username,
            expires_at: account.expires_at,
            days_until_expiry: Math.floor((new Date(account.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            error: error,
            action: 'using_existing_token'
          }));
        }
      }
    }

    // Check if this is a thread mode post
    if (threadData?.threadsMode === 'thread' && threadData.threadPosts && threadData.threadPosts.length > 0) {
      console.log(`Creating Threads thread with ${threadData.threadPosts.length} posts`);

      // Convert thread media from array of arrays to flat array (one media per post)
      // Threads API expects mediaUrls[i] to be a single URL for post i
      const flatMediaUrls = (threadData.threadsThreadMedia || [])
        .map(mediaArray => {
          // Check if mediaArray is an array and has items
          if (Array.isArray(mediaArray) && mediaArray.length > 0) {
            const firstItem = mediaArray[0];

            // Handle both string URLs and object format with url property
            if (typeof firstItem === 'string' && firstItem.trim().length > 0) {
              return firstItem; // Plain string URL
            } else if (firstItem && typeof firstItem === 'object' && 'url' in firstItem) {
              // Object with url property (like { url: string, type: string, thumbnailUrl?: string })
              const url = (firstItem as { url: string }).url;
              if (typeof url === 'string' && url.trim().length > 0) {
                return url;
              }
            }
          }
          return undefined;
        })
        .filter((url): url is string => url !== undefined);

      console.log('Thread media URLs:', flatMediaUrls);
      console.log('Raw thread media data:', JSON.stringify(threadData.threadsThreadMedia));

      // Use queue-based processing for Threads threads to bypass 60s timeout
      // Each post is processed sequentially via QStash to handle unlimited thread length

      console.log('[Threads Thread] Creating thread job for queue processing');

      // Ensure we have a supabase client
      if (!supabase) {
        throw new Error('Supabase client is required for thread job creation');
      }

      const { Client } = await import('@upstash/qstash');
      const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

      // Ensure we have a userId (either passed or from account)
      const finalUserId = userId || account.user_id;
      if (!finalUserId) {
        throw new Error('User ID is required for thread job creation');
      }

      // Create thread job in database
      const { data: threadJob, error: jobError } = await supabase
        .from('thread_jobs')
        .insert({
          user_id: finalUserId,
          account_id: account.id,
          posts: threadData.threadPosts,
          media_urls: threadData.threadsThreadMedia || [],
          status: 'pending'
        })
        .select()
        .single();

      if (jobError || !threadJob) {
        console.error('[Threads Thread] Failed to create thread job:', jobError);
        throw new Error('Failed to create thread job');
      }

      console.log(`[Threads Thread] Job created: ${threadJob.id}`);

      // Queue first post via QStash
      try {
        await qstash.publishJSON({
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/queue/threads/process-post`,
          body: {
            jobId: threadJob.id,
            postIndex: 0
          },
          retries: 3
        });

        console.log(`[Threads Thread] First post queued for job ${threadJob.id}`);

        // Extract thumbnail URL (can be string or object with url property)
        const firstMedia = threadData.threadsThreadMedia?.[0]?.[0];
        let thumbnailUrl: string | undefined;
        if (typeof firstMedia === 'string') {
          thumbnailUrl = firstMedia;
        } else if (firstMedia && typeof firstMedia === 'object' && 'url' in firstMedia) {
          thumbnailUrl = (firstMedia as any).url;
        } else {
          thumbnailUrl = flatMediaUrls[0];
        }

        return {
          success: true,
          threadJobId: threadJob.id,
          async: true, // Indicates async processing
          thumbnailUrl,
          message: `Threads thread queued for processing (${threadData.threadPosts.length} posts)`
        };

      } catch (queueError) {
        console.error('[Threads Thread] Failed to queue first post:', queueError);

        // Clean up job
        await supabase
          .from('thread_jobs')
          .update({ status: 'failed', error_message: 'Failed to queue post' })
          .eq('id', threadJob.id);

        throw new Error('Failed to queue thread for processing');
      }
    } else {
      // Single post mode
      // Use first media URL if available
      const mediaUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : undefined;

      // Check if this is a video post - if so, use two-phase processing
      if (mediaUrl) {
        const videoExtensions = ['.mp4', '.mov', '.m4v'];
        const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));

        if (isVideo) {
          console.log('[Threads Phase 1] Detected video, using two-phase processing');

          // Validate required fields for video posting
          if (!accessToken || !account.platform_user_id) {
            console.error('Missing required Threads credentials for video:', {
              hasToken: !!accessToken,
              tokenLength: accessToken?.length,
              hasPlatformUserId: !!account.platform_user_id,
              platformUserId: account.platform_user_id
            });
            throw new Error('Missing required fields: accessToken and platform_user_id are required for Threads video posting');
          }

          const { ThreadsClient } = await import('@/lib/threads/client');
          const threadsClient = new ThreadsClient({
            accessToken: accessToken,
            userID: account.platform_user_id
          });

          const { containerId } = await threadsClient.createContainerOnly(content, mediaUrl);

          console.log('[Threads Phase 1] Video container created:', containerId);

          return {
            success: true,
            twoPhase: true,
            platform: 'threads',
            containerId: containerId,
            message: 'Threads video container created, waiting for processing'
          };
        }
      }

      // For text-only or image posts, use single-phase processing
      // Validate required fields
      if (!accessToken || !account.platform_user_id) {
        console.error('Missing required Threads credentials:', {
          hasToken: !!accessToken,
          tokenLength: accessToken?.length,
          hasPlatformUserId: !!account.platform_user_id,
          platformUserId: account.platform_user_id
        });
        throw new Error('Missing required fields: accessToken and platform_user_id are required for Threads posting');
      }

      console.log('Creating single Threads post with media:', mediaUrl);

      // Wrap API call with retry logic for transient errors
      const result = await retryWithBackoff(async () => {
        const threadsService = new ThreadsService({
          accessToken: accessToken,
          userID: account.platform_user_id
        });

        return await threadsService.createPost({
          text: content,
          imageUrl: mediaUrl
        });
      }, {
        ...PLATFORM_RETRY_CONFIG,
        onRetry: (attempt, error, delay) => {
          console.log(JSON.stringify({
            event: 'threads_post_retry',
            attempt,
            error: error.message,
            delay_ms: Math.round(delay),
            account_id: account.id
          }));
        }
      });

      return {
        success: true,
        id: result.id,
        message: 'Posted to Threads successfully'
      };
    }
  } catch (error) {
    console.error('Threads posting error:', error);

    // Check for invalid token error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Invalid OAuth access token') || errorMessage.includes('code 190')) {
      // Mark account as needing reconnection
      if (supabase) {
        await supabase
          .from('social_accounts')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id);
        console.log('Marked Threads account as inactive due to invalid token');
      }
      throw new Error('Threads token is invalid. Please disconnect and reconnect your Threads account in Settings → Social Accounts.');
    }

    throw error;
  }
}

export async function postToPinterestDirect(
  content: string,
  account: any,
  mediaUrls?: string[],
  options?: { boardId?: string }
) {
  console.log('=== DIRECT PINTEREST POST ===');
  console.log('Content:', content);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);
  console.log('Board ID from options:', options?.boardId || 'not provided');

  try {
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('Pinterest posts require an image');
    }

    // Normalize mediaUrls - extract URL strings from objects if needed
    const normalizedMediaUrls: string[] | undefined = mediaUrls?.map(item => {
      if (typeof item === 'string') {
        return item;
      } else if (item && typeof item === 'object' && (item as any).url) {
        console.log('[Pinterest] Extracting URL from object:', (item as any).url);
        return (item as any).url;
      } else {
        console.error('[Pinterest] Invalid media URL format:', item);
        return '';
      }
    }).filter(url => url !== '');

    console.log('[Pinterest] Normalized media URLs:', normalizedMediaUrls);

    if (!normalizedMediaUrls || normalizedMediaUrls.length === 0) {
      throw new Error('Pinterest posts require valid image URLs');
    }

    // Validate mixed media - Pinterest doesn't support mixing images and videos
    const videoExtensions = ['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv', '.flv', '.wmv'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

    let hasVideo = false;
    let hasImage = false;

    for (const url of normalizedMediaUrls) {
      const lowerUrl = url.toLowerCase();
      if (videoExtensions.some(ext => lowerUrl.endsWith(ext))) {
        hasVideo = true;
      } else if (imageExtensions.some(ext => lowerUrl.endsWith(ext))) {
        hasImage = true;
      }
    }

    if (hasVideo && hasImage) {
      throw new Error(
        'Pinterest doesn\'t support mixing images and videos in one post. ' +
        'Please post images only, videos only, or create separate posts for each media type.'
      );
    }

    const pinterestService = new PinterestService(account.access_token);

    // Format content for Pinterest (title + description)
    const { title, description } = formatPinterestContent(content);

    // Pinterest requires a board_id
    // Priority: 1) passed board ID (from scheduled post), 2) account default
    // No automatic fallback - user must explicitly select a board
    const boardId = options?.boardId || account.board_id;

    if (!boardId) {
      // Check if user has any boards to provide helpful error message
      const boards = await pinterestService.getBoards();
      if (boards.length === 0) {
        throw new Error('No Pinterest boards found. Please create a board on Pinterest first, then try again.');
      }
      // List available boards in error message to help user
      const boardNames = boards.slice(0, 5).map((b: any) => `"${b.name}"`).join(', ');
      const moreBoards = boards.length > 5 ? ` and ${boards.length - 5} more` : '';
      throw new Error(
        `Pinterest board not selected. Please select a board when creating the post. ` +
        `Available boards: ${boardNames}${moreBoards}`
      );
    }
    console.log(`Pinterest: Using specified board ID: ${boardId}`);

    // Check if this is a single video - use two-phase processing to avoid timeouts
    const isSingleVideo = hasVideo && !hasImage && normalizedMediaUrls.length === 1;

    if (isSingleVideo) {
      console.log('=== Pinterest Video: Using Two-Phase Processing ===');
      // Phase 1: Upload video without waiting for processing
      const { PinterestClient } = await import('@/lib/pinterest/client');
      const pinterestClient = new PinterestClient(account.access_token, false);

      const { mediaId } = await pinterestClient.startVideoUpload(normalizedMediaUrls[0]);

      return {
        success: true,
        twoPhase: true,
        platform: 'pinterest',
        mediaId: mediaId,
        boardId: boardId,
        title: title,
        description: description,
        message: 'Pinterest video uploaded, waiting for processing'
      };
    }

    // Standard image/carousel processing (synchronous - fast)
    // Wrap API call with retry logic for transient errors
    const result = await retryWithBackoff(async () => {
      return await pinterestService.createSmartPin(
        boardId,
        title,
        description,
        normalizedMediaUrls // Pass normalized media URLs for smart detection
      );
    }, {
      ...PLATFORM_RETRY_CONFIG,
      onRetry: (attempt, error, delay) => {
        console.log(JSON.stringify({
          event: 'pinterest_post_retry',
          attempt,
          error: error.message,
          delay_ms: Math.round(delay),
          account_id: account.id
        }));
      }
    });

    return {
      success: true,
      id: result.id,
      message: 'Posted to Pinterest successfully'
    };
  } catch (error) {
    console.error('Pinterest posting error:', error);
    throw error;
  }
}

export async function postToTikTokDirect(content: string, account: any, mediaUrls?: any[]) {
  console.log('=== DIRECT TIKTOK POST ===');
  console.log('Content:', content);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  try {
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('TikTok posts require a video');
    }

    // Normalize mediaUrls - extract URL strings from objects if needed
    const firstMedia = mediaUrls[0];
    const videoUrl = typeof firstMedia === 'string' ? firstMedia : firstMedia?.url;

    if (!videoUrl) {
      throw new Error('Invalid media URL format');
    }

    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    const isVideo = videoExtensions.some(ext => videoUrl.toLowerCase().includes(ext));

    if (!isVideo) {
      throw new Error('TikTok only supports video content');
    }

    // Ensure token is valid and refresh if needed
    const { ensureTikTokTokenValid } = await import('@/lib/tiktok/token-manager');
    const { valid, token, error: tokenError } = await ensureTikTokTokenValid(account.id);

    if (!valid || !token) {
      throw new Error(tokenError || 'TikTok token is invalid. Please reconnect your TikTok account.');
    }

    console.log('[TikTok Posting] Using validated token');

    // Format content for TikTok
    const formattedContent = TikTokService.formatContent(content);

    // Wrap API call with retry logic for transient errors
    // Note: TikTok posting depends on app approval status
    const result = await retryWithBackoff(async () => {
      const tiktokService = new TikTokService(token);
      return await tiktokService.createPost(
        formattedContent,
        videoUrl,
        'PUBLIC_TO_EVERYONE' // Will be overridden to SELF_ONLY if app is unaudited
      );
    }, {
      ...PLATFORM_RETRY_CONFIG,
      onRetry: (attempt, error, delay) => {
        console.log(JSON.stringify({
          event: 'tiktok_post_retry',
          attempt,
          error: error.message,
          delay_ms: Math.round(delay),
          account_id: account.id
        }));
      }
    });

    return {
      success: result.success,
      publishId: result.publishId,
      sandbox: result.sandbox,
      message: result.message
    };
  } catch (error) {
    console.error('TikTok posting error:', error);
    throw error;
  }
}