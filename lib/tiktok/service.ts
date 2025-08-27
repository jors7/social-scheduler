import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Use direct post endpoint for immediate publishing
const TIKTOK_DIRECT_POST_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
// Use inbox endpoint for drafts
const TIKTOK_INBOX_URL = 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/';
const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';
const TIKTOK_STATUS_URL = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/';

export class TikTokService {
  private accessToken: string;
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Get user profile information
   */
  async getUserProfile() {
    try {
      const response = await fetch(
        `${TIKTOK_USER_INFO_URL}?fields=open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get TikTok user info: ${response.status}`);
      }

      const data = await response.json();
      const userInfo = data.data?.user;
      
      return {
        id: userInfo?.open_id,
        username: userInfo?.display_name,
        name: userInfo?.display_name,
        bio: userInfo?.bio_description,
        profileImageUrl: userInfo?.avatar_url,
        profileUrl: userInfo?.profile_deep_link,
        isVerified: userInfo?.is_verified,
        followers: userInfo?.follower_count,
        following: userInfo?.following_count,
        likes: userInfo?.likes_count,
        videos: userInfo?.video_count,
      };
    } catch (error) {
      console.error('TikTok user profile error:', error);
      throw error;
    }
  }

  /**
   * Initialize a video upload using PULL_FROM_URL
   * TikTok will download the video from the provided URL
   * 
   * @param title - Video title/caption
   * @param videoUrl - Public URL of the video (must be HTTPS)
   * @param privacyLevel - Privacy level (PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, SELF_ONLY)
   * @param options - Additional video options
   */
  async createPost(
    title: string,
    videoUrl: string,
    privacyLevel: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY' = 'PUBLIC_TO_EVERYONE',
    options?: {
      disableComment?: boolean;
      disableDuet?: boolean;
      disableStitch?: boolean;
      allowComment?: boolean;
      allowDuet?: boolean;
      allowStitch?: boolean;
      allowDownload?: boolean;
      videoCoverTimestamp?: number;
    }
  ) {
    try {
      // IMPORTANT: Sandbox apps can only use SELF_ONLY privacy level
      // Override privacy level for sandbox mode
      const isSandbox = true; // Set to false when app is approved
      if (isSandbox && privacyLevel !== 'SELF_ONLY') {
        console.warn('Sandbox mode: Overriding privacy level to SELF_ONLY');
        privacyLevel = 'SELF_ONLY';
      }
      
      // Use inbox endpoint for drafts (SELF_ONLY), direct post for public
      const isDraft = privacyLevel === 'SELF_ONLY';
      const endpoint = isDraft ? TIKTOK_INBOX_URL : TIKTOK_DIRECT_POST_URL;
      
      // Prepare request body based on endpoint
      let requestBody: any = {
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl, // TikTok will download from this URL
        }
      };
      
      // For inbox endpoint (sandbox/drafts), we can optionally include post_info
      // but with limited fields
      if (isDraft) {
        // Inbox endpoint has simpler structure
        requestBody.post_info = {
          title: title.substring(0, 2200), // Caption text
          // Note: privacy_level and other settings are not used in inbox
        };
      } else {
        // Direct post includes full post_info
        requestBody.post_info = {
          title: title.substring(0, 2200), // TikTok actually allows 2200 characters
          privacy_level: privacyLevel,
          disable_comment: options?.disableComment || false,
          disable_duet: options?.disableDuet || false,
          disable_stitch: options?.disableStitch || false,
          video_cover_timestamp_ms: options?.videoCoverTimestamp || 1000,
        };
      }
      
      console.log('TikTok upload request:', {
        endpoint,
        isDraft,
        videoUrl,
        title: title.substring(0, 50) + '...'
      });

      // Step 1: Initialize the upload
      const initResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(requestBody),
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        console.error('TikTok upload init error:', {
          status: initResponse.status,
          error: errorData,
          endpoint: endpoint,
          requestBody: requestBody
        });
        
        // Check for specific error codes
        const errorMessage = errorData.error?.message || errorData.message || 'Unknown error';
        const errorCode = errorData.error?.code || errorData.error_code;
        
        if (errorCode === 'invalid_param' || errorMessage.includes('invalid')) {
          throw new Error(`Invalid parameters: ${errorMessage}. Please check video requirements.`);
        }
        
        if (errorCode === 'scope_not_authorized' || errorMessage.includes('scope')) {
          throw new Error(`Missing permissions. Please reconnect your TikTok account with video.publish scope.`);
        }
        
        if (errorMessage.includes('guidelines') || errorMessage.includes('integration')) {
          throw new Error(`${errorMessage}. Please review our integration guidelines at https://developers.tiktok.com/doc/content-sharing-guidelines/`);
        }
        
        throw new Error(`Failed to initialize TikTok upload: ${errorMessage}`);
      }

      const initData = await initResponse.json();
      console.log('TikTok upload initialized:', initData);
      
      // Log the full response for debugging
      console.log('TikTok API Response Details:', {
        hasData: !!initData.data,
        hasPublishId: !!(initData.data?.publish_id || initData.publish_id),
        publishId: initData.data?.publish_id || initData.publish_id,
        fullResponse: JSON.stringify(initData, null, 2)
      });
      
      // CRITICAL: Store publish_id for debugging
      if (initData.data?.publish_id || initData.publish_id) {
        console.log('🎯 SAVE THIS PUBLISH ID FOR STATUS CHECK:', initData.data?.publish_id || initData.publish_id);
        console.log('To check status, go to: /dashboard/tiktok-debug');
      }

      // The actual video upload would happen here
      // TikTok's API requires uploading the video chunks to their servers
      // This is complex and requires handling multipart uploads
      
      // Note: With PULL_FROM_URL, no upload_url is returned
      // TikTok will download the video from the provided URL
      // Processing takes 30 seconds to 2 minutes
      
      const publishId = initData.data?.publish_id || initData.publish_id;
      
      if (!publishId) {
        console.warn('No publish_id returned from TikTok. Full response:', initData);
      }
      
      return {
        success: true,
        publishId: publishId,
        uploadUrl: null, // No upload URL with PULL_FROM_URL
        message: isDraft 
          ? 'Video sent to TikTok inbox. Check your TikTok app Drafts folder in 2-5 minutes.' 
          : 'Video upload initiated. Processing takes 2-5 minutes. Check your TikTok app.'
      };

    } catch (error) {
      console.error('TikTok post creation error:', error);
      throw error;
    }
  }

  /**
   * Check the status of a video upload
   * @param publishId - The publish ID returned from createPost
   */
  async checkUploadStatus(publishId: string) {
    try {
      const response = await fetch(TIKTOK_STATUS_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publish_id: publishId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check upload status');
      }

      const data = await response.json();
      return data.data?.status || data.status;
    } catch (error) {
      console.error('Error checking upload status:', error);
      throw error;
    }
  }

  /**
   * Format content for TikTok
   * TikTok has specific requirements for video content
   */
  static formatContent(content: string): string {
    // TikTok captions have a 150 character limit
    const maxLength = 150;
    
    // Clean HTML and format content
    let cleanContent = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Extract hashtags to preserve them
    const hashtags = cleanContent.match(/#\w+/g) || [];
    const hashtagsText = hashtags.join(' ');
    
    // Remove hashtags from main content to calculate length
    let mainContent = cleanContent;
    hashtags.forEach(tag => {
      mainContent = mainContent.replace(tag, '');
    });
    mainContent = mainContent.trim();

    // If content is too long, truncate and add hashtags at the end
    if (cleanContent.length > maxLength) {
      const availableLength = maxLength - hashtagsText.length - 4; // 4 for "... "
      if (availableLength > 20) {
        cleanContent = mainContent.substring(0, availableLength) + '... ' + hashtagsText;
      } else {
        // If hashtags are too long, just truncate everything
        cleanContent = cleanContent.substring(0, maxLength - 3) + '...';
      }
    }

    return cleanContent;
  }
}

/**
 * Helper function to get TikTok service for a user
 */
export async function getUserTikTokService(userId: string) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // Get TikTok account
  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'tiktok')
    .eq('is_active', true)
    .single();

  if (error || !account) {
    throw new Error('TikTok account not connected');
  }

  return new TikTokService(account.access_token);
}