import { BlueskyService } from '@/lib/bluesky/service';
import { FacebookService } from '@/lib/facebook/service';
import { InstagramService } from '@/lib/instagram/service';
import { LinkedInService } from '@/lib/linkedin/service';
import { TwitterService } from '@/lib/twitter/service';
import { ThreadsService } from '@/lib/threads/service';
import { PinterestService, formatPinterestContent } from '@/lib/pinterest/service';
import { TikTokService } from '@/lib/tiktok/service';
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
    const response = await fetch(`${refreshUrl}?${params}`, {
      method: 'GET'
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
    const facebookService = new FacebookService();
    let result;

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
      result = await facebookService.createStoryPost(
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
      result = await facebookService.createReelPost(
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
      result = await facebookService.createPost(
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
        result = await facebookService.createVideoPost(
          account.platform_user_id,
          account.access_token,
          content,
          mediaUrl
        );
      } else {
        console.log('Creating Facebook photo post');
        result = await facebookService.createPhotoPost(
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
      result = await facebookService.createCarouselPost(
        account.platform_user_id,
        account.access_token,
        content,
        imageUrls
      );
    }

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

export async function postToBlueskyDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT BLUESKY POST ===');
  console.log('Content:', JSON.stringify(content));
  console.log('Content length:', content.length);
  console.log('First 10 chars:', JSON.stringify(content.substring(0, 10)));
  console.log('Content type:', typeof content);
  console.log('Media URLs:', JSON.stringify(mediaUrls));
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  // Make absolutely sure content is a string
  const textContent = String(content);
  console.log('Text content after String():', JSON.stringify(textContent));

  const blueskyService = new BlueskyService();
  const result = await blueskyService.createPost(
    account.access_token, // identifier stored in access_token
    account.access_secret, // password stored in access_secret
    textContent,
    mediaUrls
  );

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
    const instagramService = new InstagramService({
      accessToken: account.access_token,
      userID: account.platform_user_id,
      appSecret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET
    });

    const result = await instagramService.createPost({
      caption: content,
      mediaUrls: normalizedMediaUrls,
      isStory: options?.isStory,
      isReel: options?.isReel
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
        const result = await linkedInService.postWithVideo(content, mediaBuffer, mimeType);

        return {
          success: true,
          id: result.id,
          message: 'Posted to LinkedIn with video successfully'
        };
      } else {
        console.log('LinkedIn: Detected image, using image upload API');
        const result = await linkedInService.postWithImage(content, mediaBuffer, mimeType);

        return {
          success: true,
          id: result.id,
          message: 'Posted to LinkedIn with image successfully'
        };
      }
    } else {
      // Text-only post
      const result = await linkedInService.shareContent({ text: content });

      return {
        success: true,
        id: result.id,
        message: 'Posted to LinkedIn successfully'
      };
    }
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
      const result = await twitterService.postTweet(content, mediaIds);

      return {
        success: true,
        id: result.id,
        thumbnailUrl, // Include thumbnail URL for video posts
        message: 'Posted to Twitter with media successfully'
      };
    } else {
      // Text-only tweet
      const result = await twitterService.postTweet(content);

      return {
        success: true,
        id: result.id,
        message: 'Posted to Twitter successfully'
      };
    }
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
  threadData?: { threadsMode?: string; threadPosts?: string[]; threadsThreadMedia?: string[] }
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
            throw new Error(`Threads token expired and refresh failed: ${error}. Please reconnect your Threads account in Settings.`);
          }
          // If not expired yet, try with existing token
          console.warn('Using existing token despite refresh failure');
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
          // Check if mediaArray is an array and has valid string URLs
          if (Array.isArray(mediaArray) && mediaArray.length > 0) {
            const firstItem = mediaArray[0];
            // Only return if it's a non-empty string (not an object or empty string)
            if (typeof firstItem === 'string' && firstItem.trim().length > 0) {
              return firstItem;
            }
          }
          return undefined;
        })
        .filter((url): url is string => url !== undefined);

      console.log('Thread media URLs:', flatMediaUrls);
      console.log('Raw thread media data:', JSON.stringify(threadData.threadsThreadMedia));

      // Call the thread posting API
      const threadResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/post/threads/thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account.platform_user_id,
          accessToken: accessToken,
          posts: threadData.threadPosts,
          mediaUrls: flatMediaUrls
        })
      });

      if (!threadResponse.ok) {
        const errorData = await threadResponse.json();
        throw new Error(errorData.error || 'Failed to create thread');
      }

      const threadResult = await threadResponse.json();
      return {
        success: true,
        id: threadResult.threadId,
        thumbnailUrl: threadResult.thumbnailUrl, // Include thumbnail URL for display
        message: `Posted Threads thread with ${threadData.threadPosts.length} posts successfully`
      };
    } else {
      // Single post mode
      const threadsService = new ThreadsService({
        accessToken: accessToken,
        userID: account.platform_user_id
      });

      // Use first media URL if available
      const imageUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : undefined;

      console.log('Creating single Threads post with media:', imageUrl);

      const result = await threadsService.createPost({
        text: content,
        imageUrl: imageUrl
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

export async function postToPinterestDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT PINTEREST POST ===');
  console.log('Content:', content);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  try {
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('Pinterest posts require an image');
    }

    const pinterestService = new PinterestService(account.access_token);

    // Format content for Pinterest (title + description)
    const { title, description } = formatPinterestContent(content);

    // Pinterest requires a board_id - we'll use the first/default board
    // If board_id is stored in account, use that, otherwise fetch boards
    let boardId = account.board_id;

    if (!boardId) {
      const boards = await pinterestService.getBoards();
      if (boards.length === 0) {
        throw new Error('No Pinterest boards found. Please create a board first.');
      }
      boardId = boards[0].id;
    }

    // Use createSmartPin to automatically detect media type (image/video/carousel)
    const result = await pinterestService.createSmartPin(
      boardId,
      title,
      description,
      mediaUrls // Pass all media URLs for smart detection
    );

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
    const tiktokService = new TikTokService(token);

    // Format content for TikTok
    const formattedContent = TikTokService.formatContent(content);

    // Note: TikTok posting depends on app approval status
    // Check if app is unaudited (will force SELF_ONLY/draft mode)
    const result = await tiktokService.createPost(
      formattedContent,
      videoUrl,
      'PUBLIC_TO_EVERYONE' // Will be overridden to SELF_ONLY if app is unaudited
    );

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