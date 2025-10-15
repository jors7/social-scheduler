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

export async function postToFacebookDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT FACEBOOK POST ===');
  console.log('Content:', content);
  console.log('Page ID:', account.platform_user_id);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);
  
  try {
    const facebookService = new FacebookService();
    let result;

    // Determine post type based on media
    if (!mediaUrls || mediaUrls.length === 0) {
      // Text-only post
      console.log('Creating text-only Facebook post');
      result = await facebookService.createPost(
        account.platform_user_id,
        account.access_token,
        content
      );
    } else if (mediaUrls.length === 1) {
      // Single media post
      const mediaUrl = mediaUrls[0];
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
      const imageUrls = mediaUrls.filter(url => 
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

export async function postToInstagramDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT INSTAGRAM POST ===');
  console.log('Content:', content);
  console.log('Account ID:', account.platform_user_id);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  try {
    const instagramService = new InstagramService({
      accessToken: account.access_token,
      userID: account.platform_user_id,
      appSecret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET
    });

    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('Instagram posts require at least one media file');
    }

    const result = await instagramService.createPost({
      caption: content,
      mediaUrls: mediaUrls
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
      // Post with image (LinkedIn only supports one image)
      const imageUrl = mediaUrls[0];
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

      const result = await linkedInService.postWithImage(content, imageBuffer, mimeType);

      return {
        success: true,
        id: result.id,
        message: 'Posted to LinkedIn with image successfully'
      };
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

export async function postToTwitterDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT TWITTER POST ===');
  console.log('Content:', content);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  try {
    const twitterService = new TwitterService({
      accessToken: account.access_token,
      accessSecret: account.access_secret
    });

    if (mediaUrls && mediaUrls.length > 0) {
      // Upload media first
      const mediaIds: string[] = [];

      for (const mediaUrl of mediaUrls.slice(0, 4)) { // Twitter allows max 4 images
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
      const flatMediaUrls = (threadData.threadsThreadMedia || []).map(mediaArray =>
        mediaArray && mediaArray.length > 0 ? mediaArray[0] : undefined
      ).filter(Boolean) as string[];

      console.log('Thread media URLs:', flatMediaUrls);

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
        message: `Posted Threads thread with ${threadData.threadPosts.length} posts successfully`
      };
    } else {
      // Single post mode
      const threadsService = new ThreadsService({
        accessToken: accessToken,
        userID: account.platform_user_id
      });

      const result = await threadsService.createPost({ text: content });

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

export async function postToTikTokDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT TIKTOK POST ===');
  console.log('Content:', content);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  try {
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('TikTok posts require a video');
    }

    // TikTok only supports videos
    const videoUrl = mediaUrls[0];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    const isVideo = videoExtensions.some(ext => videoUrl.toLowerCase().includes(ext));

    if (!isVideo) {
      throw new Error('TikTok only supports video content');
    }

    const tiktokService = new TikTokService(account.access_token);

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