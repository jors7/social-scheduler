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
      // Check if we're in sandbox mode from environment variable
      // OR if the app is unaudited (even with production credentials)
      const isSandbox = process.env.TIKTOK_SANDBOX === 'true';
      const isUnaudited = process.env.TIKTOK_UNAUDITED === 'true';
      
      // IMPORTANT: Sandbox and unaudited apps can only use SELF_ONLY privacy level
      // TikTok requires apps to be audited before they can post publicly
      if ((isSandbox || isUnaudited) && privacyLevel !== 'SELF_ONLY') {
        console.warn('App is unaudited or in sandbox mode: Overriding privacy level to SELF_ONLY (draft)');
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
      
      const publishId = initData.data?.publish_id || initData.publish_id;
      
      // CRITICAL: Store publish_id for debugging
      if (publishId) {
        console.log('🎯 SAVE THIS PUBLISH ID FOR STATUS CHECK:', publishId);
        console.log('To check status, go to: /dashboard/tiktok-debug');
        
        // For inbox/draft posts, check the processing status
        if (isDraft) {
          console.log('Draft post initiated. TikTok is processing the video...');
          // Note: TikTok needs time to process the video before it appears in drafts
          // It can take 30 seconds to several minutes depending on video size
          console.log('Video will appear in TikTok drafts after processing completes.');
        }
      }

      // The actual video upload would happen here
      // TikTok's API requires uploading the video chunks to their servers
      // This is complex and requires handling multipart uploads
      
      // Note: With PULL_FROM_URL, no upload_url is returned
      // TikTok will download the video from the provided URL
      // Processing takes 30 seconds to 2 minutes
      
      if (!publishId) {
        console.warn('No publish_id returned from TikTok. Full response:', initData);
      }
      
      // Return success based on whether we're in sandbox/unaudited mode or fully approved
      if (isSandbox || isUnaudited) {
        return {
          success: true, // Mark as true since draft posting works
          sandbox: true, // Indicate this is sandbox/unaudited mode
          publishId: publishId,
          uploadUrl: null, // No upload URL with PULL_FROM_URL
          message: `Video submitted to TikTok (ID: ${publishId}). Processing can take 2-10 minutes. Check your TikTok app drafts after processing completes.`
        };
      } else {
        // Fully approved production mode - actual public posting
        return {
          success: true,
          sandbox: false,
          publishId: publishId,
          uploadUrl: null, // No upload URL with PULL_FROM_URL
          message: 'TikTok video upload initiated successfully. Processing may take 30 seconds to 2 minutes.'
        };
      }

    } catch (error) {
      console.error('TikTok post creation error:', error);
      throw error;
    }
  }

  /**
   * Upload video using FILE_UPLOAD method (more reliable than PULL_FROM_URL)
   * @param title - Video caption
   * @param videoBuffer - Video file buffer
   * @param videoSize - Size of video in bytes
   * @param privacyLevel - Privacy level
   */
  async createPostWithFileUpload(
    title: string,
    videoBuffer: Buffer,
    videoSize: number,
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
      const isSandbox = process.env.TIKTOK_SANDBOX === 'true';
      const isUnaudited = process.env.TIKTOK_UNAUDITED === 'true';
      
      if ((isSandbox || isUnaudited) && privacyLevel !== 'SELF_ONLY') {
        console.warn('App is unaudited or in sandbox mode: Overriding privacy level to SELF_ONLY (draft)');
        privacyLevel = 'SELF_ONLY';
      }
      
      const isDraft = privacyLevel === 'SELF_ONLY';
      const endpoint = isDraft ? TIKTOK_INBOX_URL : TIKTOK_DIRECT_POST_URL;
      
      // Calculate chunk size and count
      // For videos < 64MB, use single chunk
      // For videos >= 64MB, use 50MB chunks
      const MAX_SINGLE_CHUNK_SIZE = 64 * 1024 * 1024; // 64MB
      const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks for larger files
      
      let chunkSize: number;
      let totalChunkCount: number;
      
      if (videoSize <= MAX_SINGLE_CHUNK_SIZE) {
        // Single chunk upload
        chunkSize = videoSize;
        totalChunkCount = 1;
      } else {
        // Multi-chunk upload
        chunkSize = CHUNK_SIZE;
        totalChunkCount = Math.ceil(videoSize / chunkSize);
      }
      
      console.log('TikTok FILE_UPLOAD configuration:', {
        videoSize,
        chunkSize,
        totalChunkCount,
        isDraft,
        endpoint
      });
      
      // Step 1: Initialize upload with FILE_UPLOAD
      let requestBody: any = {
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunkCount
        }
      };
      
      if (isDraft) {
        requestBody.post_info = {
          title: title.substring(0, 2200),
        };
      } else {
        requestBody.post_info = {
          title: title.substring(0, 2200),
          privacy_level: privacyLevel,
          disable_comment: options?.disableComment || false,
          disable_duet: options?.disableDuet || false,
          disable_stitch: options?.disableStitch || false,
          video_cover_timestamp_ms: options?.videoCoverTimestamp || 1000,
        };
      }
      
      const initResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        console.error('TikTok FILE_UPLOAD init error:', errorData);
        throw new Error(`Failed to initialize upload: ${errorData.error?.message || errorData.message || 'Unknown error'}`);
      }

      const initData = await initResponse.json();
      const publishId = initData.data?.publish_id;
      const uploadUrl = initData.data?.upload_url;
      
      if (!uploadUrl) {
        throw new Error('No upload URL received from TikTok');
      }
      
      console.log('TikTok upload initialized:', { publishId, uploadUrl });
      
      // Step 2: Upload chunks
      let uploadedBytes = 0;
      
      for (let chunkIndex = 0; chunkIndex < totalChunkCount; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, videoSize);
        const chunkBuffer = videoBuffer.slice(start, end);
        const chunkLength = end - start;
        
        console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunkCount}:`, {
          start,
          end,
          chunkLength
        });
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': chunkLength.toString(),
            'Content-Range': `bytes ${start}-${end - 1}/${videoSize}`
          },
          body: chunkBuffer,
        });
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Chunk upload failed:', errorText);
          throw new Error(`Failed to upload chunk ${chunkIndex + 1}: ${errorText}`);
        }
        
        uploadedBytes = end;
        console.log(`Chunk ${chunkIndex + 1} uploaded successfully. Total uploaded: ${uploadedBytes}/${videoSize}`);
      }
      
      console.log('All chunks uploaded successfully!');
      console.log('🎯 PUBLISH ID:', publishId);
      
      return {
        success: true,
        sandbox: isSandbox || isUnaudited,
        publishId: publishId,
        uploadUrl: uploadUrl,
        message: isDraft 
          ? `Video uploaded to TikTok drafts (ID: ${publishId}). Check your TikTok app.`
          : `Video uploaded to TikTok successfully (ID: ${publishId}).`
      };
      
    } catch (error) {
      console.error('TikTok FILE_UPLOAD error:', error);
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
        const errorData = await response.json();
        console.error('TikTok status check error:', errorData);
        throw new Error(`Failed to check upload status: ${errorData.error?.message || response.status}`);
      }

      const data = await response.json();
      console.log('TikTok status response:', data);
      
      // Return full data for debugging
      return {
        status: data.data?.status || data.status,
        publiclyAvailablePostId: data.data?.publicly_available_post_id || data.publicly_available_post_id,
        errorCode: data.data?.error?.code || data.error?.code,
        errorMessage: data.data?.error?.message || data.error?.message,
        fullResponse: data
      };
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
    // TikTok captions have a 2200 character limit
    const maxLength = 2200;
    
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