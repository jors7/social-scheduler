import { BlueskyService } from '@/lib/bluesky/service';
import { PinterestService } from '@/lib/pinterest/service';
import { InstagramService } from '@/lib/instagram/service';
import { createBrowserClient } from '@supabase/ssr';
import { PostingProgressTracker } from './progress-tracker';

export interface PostData {
  content: string;
  platforms: string[];
  platformContent?: Record<string, string>;
  scheduledFor?: Date;
  mediaUrls?: string[];
  selectedAccounts?: Record<string, string[]>; // platform -> array of account IDs
  pinterestBoardId?: string; // Pinterest specific - board to post to
  pinterestTitle?: string; // Pinterest specific - pin title
  pinterestDescription?: string; // Pinterest specific - pin description
  pinterestLink?: string; // Pinterest specific - destination URL
  // TikTok specific settings - Updated for audit compliance
  tiktokTitle?: string; // TikTok specific - separate title field
  tiktokPrivacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY' | ''; // TikTok specific - privacy level (no default)
  tiktokAllowComment?: boolean; // TikTok specific - allow comments (default: false)
  tiktokAllowDuet?: boolean; // TikTok specific - allow duet (default: false)
  tiktokAllowStitch?: boolean; // TikTok specific - allow stitch (default: false)
  tiktokBrandContentToggle?: boolean; // TikTok specific - branded content (paid partnership)
  tiktokBrandOrganicToggle?: boolean; // TikTok specific - promotional content (your brand)
  tiktokPhotoCoverIndex?: number; // TikTok specific - photo cover index for photo posts (0-based, default: 0)
  instagramAsStory?: boolean; // Instagram specific - post as story instead of feed post
  instagramAsReel?: boolean; // Instagram specific - post as reel instead of feed post
  instagramDisableComments?: boolean; // Instagram specific - disable comments on post
  facebookAsStory?: boolean; // Facebook specific - post as story instead of feed post
  facebookAsReel?: boolean; // Facebook specific - post as reel instead of feed post
  youtubeAsShort?: boolean; // YouTube specific - post as Short instead of regular video
  // LinkedIn specific settings
  linkedinVisibility?: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN'; // LinkedIn specific - who can see this post
  // YouTube compliance settings
  youtubeMadeForKids?: boolean; // YouTube specific - COPPA compliance (is video made for kids under 13?)
  youtubeEmbeddable?: boolean; // YouTube specific - allow embedding on other websites (default: true)
  youtubeLicense?: 'youtube' | 'creativeCommon'; // YouTube specific - video license (default: 'youtube')
  // Threads reply controls
  threadsReplyControl?: 'everyone' | 'accounts_you_follow' | 'mentioned_only'; // Threads specific - who can reply
  // Bluesky reply controls
  blueskyReplyControl?: 'everyone' | 'nobody' | 'following' | 'mentioned'; // Bluesky specific - who can reply via threadgates
  // Facebook publish controls
  facebookPublishAsDraft?: boolean; // Facebook specific - save as draft instead of publishing immediately
  // Alt text for accessibility
  instagramAltText?: string; // Instagram specific - alt text for images (accessibility)
  pinterestAltText?: string; // Pinterest specific - alt text for pins (accessibility)
  blueskyAltText?: string; // Bluesky specific - alt text for images (accessibility)
}

export interface PostResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
  data?: {
    id?: string;
    type?: string; // Post type (e.g., 'story' or 'post')
    url?: string; // Post URL (for YouTube and other platforms)
    isDraft?: boolean; // For TikTok draft posting
    message?: string; // Custom success message (e.g., for drafts)
    thumbnailUrl?: string; // Thumbnail URL from platform (for videos)
    metrics?: {
      likes?: number;
      comments?: number;
      saves?: number;
      shares?: number;
      impressions?: number;
      reach?: number;
      // Threads-specific metrics
      views?: number;
      replies?: number;
      reposts?: number;
      quotes?: number;
    };
  };
}

export class PostingService {
  private supabase;
  private postData: PostData; // Store postData for access in private methods

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    this.postData = {} as PostData; // Initialize empty
  }

  async postToMultiplePlatforms(
    postData: PostData,
    onProgress?: (platform: string, status: string) => void,
    progressTracker?: PostingProgressTracker
  ): Promise<PostResult[]> {
    // Store postData for use in private methods
    this.postData = postData;
    const results: PostResult[] = [];

    // Get user's connected accounts
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: accounts, error } = await this.supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('platform', postData.platforms);

    if (error) {
      throw new Error('Failed to get connected accounts');
    }

    // Post to each platform
    for (const platform of postData.platforms) {
      const platformAccounts = accounts?.filter(acc => acc.platform === platform) || [];
      
      if (platformAccounts.length === 0) {
        results.push({
          platform,
          success: false,
          error: `${platform} account not connected`
        });
        continue;
      }

      // Get selected accounts for this platform, or use primary/all accounts
      let accountsToPost = platformAccounts;
      
      if (postData.selectedAccounts?.[platform]) {
        // Filter to only selected accounts
        accountsToPost = platformAccounts.filter(acc => 
          postData.selectedAccounts![platform].includes(acc.id)
        );
      } else if (platformAccounts.length > 1) {
        // If multiple accounts but none selected, use primary account only
        const primaryAccount = platformAccounts.find(acc => acc.is_primary);
        accountsToPost = primaryAccount ? [primaryAccount] : [platformAccounts[0]];
      }

      // Post to each selected account
      for (const account of accountsToPost) {
        try {
          const content = postData.platformContent?.[platform] || postData.content;
          
          // Update progress tracker - starting upload
          progressTracker?.updatePlatform(platform, 'uploading');
          
          // Add Pinterest-specific data to account if needed
          if (platform === 'pinterest') {
            account.pinterest_board_id = postData.pinterestBoardId;
            account.pinterest_title = postData.pinterestTitle;
            account.pinterest_description = postData.pinterestDescription;
            account.pinterest_link = postData.pinterestLink;
          }
          
          // Add TikTok-specific data to account if needed
          if (platform === 'tiktok') {
            account.tiktok_privacy_level = postData.tiktokPrivacyLevel;
          }
          
          // Update progress tracker - processing
          const isVideo = postData.mediaUrls?.some(url =>
            ['.mp4', '.mov', '.avi', '.webm'].some(ext => url.toLowerCase().includes(ext))
          );
          if (platform === 'instagram' && postData.instagramAsStory) {
            progressTracker?.updatePlatform(platform, 'processing', 'story');
          } else if (platform === 'instagram' && postData.instagramAsReel) {
            progressTracker?.updatePlatform(platform, 'processing', 'reel');
          } else if (platform === 'instagram' && isVideo) {
            progressTracker?.updatePlatform(platform, 'processing', 'reel');
          } else if (platform === 'facebook' && postData.facebookAsReel) {
            progressTracker?.updatePlatform(platform, 'processing', 'reel');
          } else if (platform === 'facebook' && postData.facebookAsStory) {
            progressTracker?.updatePlatform(platform, 'processing', 'story');
          } else if (postData.mediaUrls && postData.mediaUrls.length > 0) {
            progressTracker?.updatePlatform(platform, 'processing');
          }
          
          const result = await this.postToPlatform(
            platform, 
            content, 
            account, 
            postData.mediaUrls,
            onProgress,
            postData
          );
          
          // Update progress tracker - success or error
          if (result.success) {
            // Check if this is a TikTok draft
            const customMessage = result.data?.isDraft ? result.data.message : undefined;
            progressTracker?.updatePlatform(platform, 'success', customMessage);
          } else {
            progressTracker?.updatePlatform(platform, 'error', undefined, result.error);
          }
          // Add account info to result
          results.push({
            ...result,
            platform: account.account_label 
              ? `${platform} (${account.account_label})`
              : platform
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          progressTracker?.updatePlatform(platform, 'error', undefined, errorMessage);
          results.push({
            platform: account.account_label 
              ? `${platform} (${account.account_label})`
              : platform,
            success: false,
            error: errorMessage
          });
        }
      }
    }

    return results;
  }

  private async postToPlatform(
    platform: string,
    content: string,
    account: any,
    mediaUrls?: any[],  // Changed from string[] to any[] to handle both formats
    onProgress?: (platform: string, status: string) => void,
    postData?: PostData
  ): Promise<PostResult> {
    // Clean content for text-only platforms
    const textContent = this.cleanHtmlContent(content);

    // Normalize mediaUrls - extract URL strings from objects if needed
    const normalizedMediaUrls: string[] | undefined = mediaUrls?.map(item => {
      if (typeof item === 'string') {
        return item;  // Already a string
      } else if (item && typeof item === 'object' && item.url) {
        return item.url;  // Extract URL from object
      } else {
        console.error(`[PostingService] Invalid media URL format:`, item);
        return '';  // Return empty string for invalid items
      }
    }).filter(url => url !== '');  // Remove any empty strings

    console.log(`Posting to ${platform}:`, {
      originalContent: content,
      cleanedContent: textContent,
      mediaUrls: normalizedMediaUrls,
      originalMediaUrlsFormat: mediaUrls?.map(item => typeof item)
    });

    switch (platform) {
      case 'facebook':
        return await this.postToFacebook(
          textContent,
          account,
          normalizedMediaUrls,
          postData?.facebookAsStory,
          postData?.facebookAsReel
        );

      case 'instagram':
        return await this.postToInstagram(
          textContent,
          account,
          normalizedMediaUrls,
          onProgress ? (status) => onProgress('instagram', status) : undefined,
          postData?.instagramAsStory,
          postData?.instagramAsReel,
          postData?.instagramAltText,
          postData?.instagramDisableComments
        );

      case 'bluesky':
        return await this.postToBluesky(textContent, account, normalizedMediaUrls);

      case 'pinterest':
        return await this.postToPinterest(textContent, account, normalizedMediaUrls);
      
      case 'tiktok':
        return await this.postToTikTok(textContent, account, normalizedMediaUrls);

      case 'linkedin':
        return await this.postToLinkedIn(textContent, account, normalizedMediaUrls);

      case 'threads':
        return await this.postToThreads(textContent, account, normalizedMediaUrls);

      case 'twitter':
        return await this.postToTwitter(textContent, account, normalizedMediaUrls);

      case 'youtube':
        return await this.postToYouTube(
          textContent,
          account,
          normalizedMediaUrls,
          postData?.youtubeAsShort
        );

      default:
        return {
          platform,
          success: false,
          error: `Posting to ${platform} not implemented yet`
        };
    }
  }


  private async postToFacebook(
    content: string,
    account: any,
    mediaUrls?: string[],
    isStory?: boolean,
    isReel?: boolean
  ): Promise<PostResult> {
    try {
      // Facebook requires a page ID (stored in platform_user_id)
      if (!account.platform_user_id) {
        throw new Error('Facebook page ID not found');
      }

      // Facebook Stories require media
      if (isStory && (!mediaUrls || mediaUrls.length === 0)) {
        throw new Error('Facebook Stories require an image or video');
      }

      // Facebook Reels require a video
      if (isReel && (!mediaUrls || mediaUrls.length === 0)) {
        throw new Error('Facebook Reels require a video');
      }

      // Get user ID for thumbnail upload
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/post/facebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId: account.platform_user_id,
          accessToken: account.access_token,
          text: content,
          mediaUrls: mediaUrls,
          isStory: isStory,
          isReel: isReel,
          userId: user.id,
          publishAsDraft: this.postData.facebookPublishAsDraft,
        }),
      });

      const data = await response.json();

      console.log('📥 Facebook API response received:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data.error || 'Facebook posting failed');
      }

      const result = {
        platform: 'facebook',
        success: true,
        postId: data.id,
        data: {
          id: data.id,
          isStory: data.isStory || false,    // Include story indicator for detection
          isReel: data.isReel || false,      // Include reel indicator for detection
          thumbnailUrl: data.thumbnailUrl    // Include thumbnail URL if present
        }
      };

      console.log('🔄 Returning PostResult:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      return {
        platform: 'facebook',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async postToInstagram(
    content: string,
    account: any,
    mediaUrls?: string[],
    onProgress?: (status: string) => void,
    isStory?: boolean,
    isReel?: boolean,
    altText?: string,
    disableComments?: boolean
  ): Promise<PostResult> {
    try {
      // Instagram requires media
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new Error('Instagram posts require an image or video');
      }

      const mediaUrl = mediaUrls[0];
      const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
      const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));

      // Use progress endpoint for videos or carousels with videos
      const hasVideo = mediaUrls.some(url => videoExtensions.some(ext => url.toLowerCase().includes(ext)));
      const isCarousel = mediaUrls.length > 1;
      
      if ((hasVideo || isCarousel) && onProgress) {
        // Get user ID for thumbnail upload
        const { data: { user } } = await this.supabase.auth.getUser();

        // Use Server-Sent Events for progress updates
        const response = await fetch('/api/post/instagram/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: account.platform_user_id,
            accessToken: account.access_token,
            text: content,
            mediaUrls: mediaUrls,
            isStory: isStory,
            isReel: isReel,
            altText: altText,
            disableComments: disableComments,
            currentUserId: user?.id, // Pass current user ID for thumbnail upload
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error('Failed to start Instagram posting');
        }

        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'progress' && onProgress) {
                  onProgress(data.status);
                } else if (data.type === 'complete') {
                  result = data;
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (e) {
                // Ignore parse errors for empty lines
              }
            }
          }
        }

        if (!result || !result.success) {
          throw new Error('Instagram posting failed');
        }

        return {
          platform: 'instagram',
          success: true,
          postId: result.id,
          data: {
            id: result.id,
            type: result.postType, // Include type (story or reel) - from SSE postType field
            thumbnailUrl: result.thumbnailUrl, // Include thumbnail URL if present
            metrics: result.metrics || {
              likes: 0,
              comments: 0,
              saves: 0,
              shares: 0,
              impressions: 0,
              reach: 0
            }
          }
        };
      } else {
        // Get user ID for thumbnail upload
        const { data: { user } } = await this.supabase.auth.getUser();

        // Regular posting without progress for images or carousels
        const response = await fetch('/api/post/instagram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: account.platform_user_id,
            accessToken: account.access_token,
            text: content,
            mediaUrls: mediaUrls, // Pass all media URLs for carousel support
            isStory: isStory,
            isReel: isReel,
            altText: altText,
            disableComments: disableComments,
            currentUserId: user?.id, // Pass current user ID for thumbnail upload
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Instagram posting failed');
        }

        return {
          platform: 'instagram',
          success: true,
          postId: data.id,
          data: {
            id: data.id,
            type: data.type, // Include type (story or post)
            thumbnailUrl: data.thumbnailUrl, // Include thumbnail URL if present
            metrics: data.metrics || {
              likes: 0,
              comments: 0,
              saves: 0,
              shares: 0,
              impressions: 0,
              reach: 0
            }
          }
        };
      }
    } catch (error) {
      return {
        platform: 'instagram',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async postToBluesky(content: string, account: any, mediaUrls?: string[]): Promise<PostResult> {
    try {
      const response = await fetch('/api/post/bluesky', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: account.access_token, // The identifier (handle/DID) is stored in access_token
          password: account.access_secret,  // The app password is stored in access_secret
          text: content,
          mediaUrls: mediaUrls,
          altText: this.postData.blueskyAltText,
          replyControl: this.postData.blueskyReplyControl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bluesky posting failed');
      }

      return {
        platform: 'bluesky',
        success: true,
        postId: data.uri,
      };
    } catch (error) {
      return {
        platform: 'bluesky',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async postToPinterest(content: string, account: any, mediaUrls?: string[]): Promise<PostResult> {
    try {
      // Pinterest requires at least one media file (image or video)
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new Error('Pinterest requires at least one image or video');
      }

      // Detect media type
      const firstUrl = mediaUrls[0].toLowerCase();
      const isVideo = firstUrl.match(/\.(mp4|mov|m4v|webm)$/);

      console.log('Pinterest: Media URLs:', mediaUrls);
      console.log('Pinterest: Is video:', isVideo);
      console.log('Pinterest: Media count:', mediaUrls.length);

      // Determine pin type
      let pinType = 'image';
      if (isVideo) {
        pinType = 'video';
      } else if (mediaUrls.length >= 2 && mediaUrls.length <= 5) {
        pinType = 'carousel';
      }

      console.log('Pinterest: Creating', pinType, 'pin');

      const response = await fetch('/api/post/pinterest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: account.access_token,
          boardId: account.pinterest_board_id, // This needs to be set
          title: account.pinterest_title || 'New Pin',
          description: account.pinterest_description || content, // Use custom description or fallback to content
          mediaUrls: mediaUrls, // Pass all media URLs
          pinType: pinType, // Specify the pin type
          link: account.pinterest_link, // Optional destination URL
          altText: this.postData.pinterestAltText, // Alt text for accessibility
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle Pinterest-specific errors
        if (data.error?.includes('permission') || data.error?.includes('403')) {
          return {
            platform: 'pinterest',
            success: false,
            error: 'Pinterest board permissions error. Please check your board settings.'
          };
        }
        throw new Error(data.error || 'Pinterest posting failed');
      }

      return {
        platform: 'pinterest',
        success: true,
        postId: data.id,
      };
    } catch (error) {
      // Provide more helpful error messages
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('requires at least one')) {
        errorMessage = 'Pinterest requires an image or video to create a pin';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
        errorMessage = 'Pinterest account needs to be reconnected';
      } else if (errorMessage.includes('board')) {
        errorMessage = 'Pinterest board selection or permissions error';
      } else if (errorMessage.includes('Carousel pins require 2-5 images')) {
        errorMessage = 'Carousel pins require between 2 and 5 images';
      }

      return {
        platform: 'pinterest',
        success: false,
        error: errorMessage
      };
    }
  }

  private async postToTikTok(content: string, account: any, mediaUrls?: string[]): Promise<PostResult> {
    try {
      // TikTok requires a video or photo
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new Error('TikTok requires a video or photo to post');
      }

      // Extract TikTok settings from postData - Updated for audit compliance
      const {
        tiktokTitle,
        tiktokPrivacyLevel,
        tiktokAllowComment,
        tiktokAllowDuet,
        tiktokAllowStitch,
        tiktokBrandContentToggle,
        tiktokBrandOrganicToggle,
        tiktokPhotoCoverIndex
      } = this.postData;

      // Use privacy level from postData (required field, no default)
      const privacyLevel = tiktokPrivacyLevel || 'PUBLIC_TO_EVERYONE';
      const isDraft = privacyLevel === 'SELF_ONLY';

      // Use title if provided, otherwise fall back to content
      const postTitle = tiktokTitle || content;

      // Detect if we're posting photos or video
      const imageExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
      const videoExtensions = /\.(mp4|mov|avi|wmv|flv|mkv)$/i;

      const photoUrls = mediaUrls.filter(url => imageExtensions.test(url));
      const videoUrls = mediaUrls.filter(url => videoExtensions.test(url));

      const isPhotoPost = photoUrls.length > 0 && videoUrls.length === 0;

      console.log('TikTok posting:', {
        isPhotoPost,
        photoCount: photoUrls.length,
        videoCount: videoUrls.length
      });

      // Route to appropriate endpoint based on media type
      if (isPhotoPost) {
        // Photo post - call photo API endpoint
        const response = await fetch('/api/post/tiktok-photo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken: account.access_token,
            title: postTitle,
            description: content, // Full content as description
            photoUrls: photoUrls,
            photoCoverIndex: tiktokPhotoCoverIndex || 0,
            privacyLevel: privacyLevel,
            options: {
              // Interaction settings - Photos only support comments
              disableComment: !tiktokAllowComment,
              autoAddMusic: false, // User can enable this in future
              // Commercial content disclosure - REQUIRED by TikTok API
              brandContentToggle: tiktokBrandContentToggle || false,
              brandOrganicToggle: tiktokBrandOrganicToggle || false,
            }
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'TikTok photo posting failed');
        }

        return {
          platform: 'tiktok',
          success: true,
          postId: data.publishId,
          data: {
            id: data.publishId,
            isDraft: isDraft,
            message: data.message || `Photo post ${isDraft ? 'saved as draft' : 'uploaded'} to TikTok`
          }
        };
      } else {
        // Video post - use existing video endpoint
        const videoUrl = videoUrls[0] || mediaUrls[0];

        console.log('Sending video URL to TikTok API:', videoUrl);

        const response = await fetch('/api/post/tiktok', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken: account.access_token,
            content: postTitle, // Use title or content
            videoUrl: videoUrl,
            privacyLevel: privacyLevel,
            options: {
              // Interaction settings - Use values from postData (all default to false)
              disableComment: !tiktokAllowComment, // Invert: allow -> disable
              disableDuet: !tiktokAllowDuet,
              disableStitch: !tiktokAllowStitch,
              // Commercial content disclosure - REQUIRED by TikTok API
              brandContentToggle: tiktokBrandContentToggle || false,
              brandOrganicToggle: tiktokBrandOrganicToggle || false,
            }
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'TikTok posting failed');
        }

        // Check if this is a draft posting (sandbox/unaudited mode)
        if (data.sandbox && isDraft) {
          return {
            platform: 'tiktok',
            success: true,
            postId: data.publishId,
            data: {
              id: data.publishId,
              isDraft: true,
              message: 'Video saved as draft in your TikTok app'
            }
          };
        }

        return {
          platform: 'tiktok',
          success: true,
          postId: data.publishId,
        };
      }
    } catch (error) {
      return {
        platform: 'tiktok',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private cleanHtmlContent(content: string): string {
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
    
    // Clean up excessive line breaks (more than 2 in a row)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Replace multiple spaces with single space (but preserve line breaks)
    cleaned = cleaned.replace(/[^\S\n]+/g, ' ');
    
    // Trim whitespace from start and end, and from each line
    cleaned = cleaned
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim();
    
    return cleaned;
  }

  private async postToLinkedIn(content: string, account: any, mediaUrls?: string[]): Promise<PostResult> {
    try {
      console.log('PostToLinkedIn called with:', {
        hasContent: !!content,
        contentLength: content?.length,
        mediaUrls: mediaUrls,
        mediaUrlsLength: mediaUrls?.length
      });

      const response = await fetch('/api/post/linkedin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          mediaUrl: mediaUrls?.[0], // LinkedIn supports one image per post
          mediaType: mediaUrls?.[0] ? 'image' : undefined,
          visibility: this.postData.linkedinVisibility || 'PUBLIC',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'LinkedIn posting failed');
      }

      return {
        platform: 'linkedin',
        success: true,
        postId: data.postId,
      };
    } catch (error) {
      return {
        platform: 'linkedin',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async postToThreads(content: string, account: any, mediaUrls?: string[]): Promise<PostResult> {
    try {
      console.log('Posting to Threads with account:', {
        platform_user_id: account.platform_user_id,
        username: account.username,
        has_token: !!account.access_token
      });

      const response = await fetch('/api/post/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: account.platform_user_id,
          accessToken: account.access_token,
          text: content,
          mediaUrl: mediaUrls?.[0], // Threads supports one image per post
          replyControl: this.postData.threadsReplyControl || 'everyone',
        }),
      });

      const data = await response.json();
      console.log('Threads API response:', data);

      if (!response.ok) {
        console.error('Threads posting failed:', data);
        throw new Error(data.error || 'Threads posting failed');
      }

      console.log('Threads post successful:', {
        postId: data.id,
        containerId: data.containerId
      });

      // Check post status
      try {
        const statusResponse = await fetch('/api/post/threads/check-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postId: data.id,
            accessToken: account.access_token,
          }),
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('Threads post status:', statusData);
          
          if (statusData.permalink) {
            console.log('View your post at:', statusData.permalink);
          }
        }
      } catch (statusError) {
        console.warn('Could not check post status:', statusError);
      }

      return {
        platform: 'threads',
        success: true,
        postId: data.id,
        data: {
          id: data.id,
          metrics: {
            views: 0,
            likes: 0,
            replies: 0,
            reposts: 0,
            quotes: 0,
            shares: 0
          }
        }
      };
    } catch (error) {
      console.error('Threads posting error:', error);
      return {
        platform: 'threads',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async postToTwitter(content: string, account: any, mediaUrls?: string[]): Promise<PostResult> {
    try {
      // Get current user from auth
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/post/twitter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: content,
          accessToken: account.access_token,
          accessSecret: account.access_secret,
          userId: user.id,
          mediaUrls: mediaUrls,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Twitter posting failed');
      }

      return {
        platform: 'twitter',
        success: true,
        postId: data.data?.id,
        data: {
          id: data.data?.id,
          metrics: {
            likes: 0,
            comments: 0,
            shares: 0,
            impressions: 0,
            reach: 0
          }
        }
      };
    } catch (error) {
      console.error('Twitter posting error:', error);
      return {
        platform: 'twitter',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async postToYouTube(
    content: string,
    account: any,
    mediaUrls?: string[],
    isShort?: boolean
  ): Promise<PostResult> {
    try {
      // YouTube requires a video
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new Error('YouTube requires a video to post');
      }

      // Get user ID for thumbnail upload
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use the first media URL as the video
      const videoUrl = mediaUrls[0];

      console.log('Posting to YouTube:', {
        videoUrl: videoUrl.substring(0, 50) + '...',
        isShort: isShort,
        contentLength: content?.length
      });

      // Extract title from content (first line or first 100 chars)
      const lines = content.split('\n').filter(line => line.trim());
      const title = lines[0]?.substring(0, 100) || 'New Video';
      const description = content;

      const response = await fetch('/api/post/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
          description: description,
          videoUrl: videoUrl,
          isShort: isShort,
          privacyStatus: 'public', // Can be made configurable later
          userId: user.id, // Pass user ID for thumbnail upload
          madeForKids: this.postData.youtubeMadeForKids,
          embeddable: this.postData.youtubeEmbeddable !== false, // Default to true
          license: this.postData.youtubeLicense || 'youtube',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'YouTube posting failed');
      }

      return {
        platform: 'youtube',
        success: true,
        postId: data.id,
        data: {
          id: data.id,
          type: isShort ? 'short' : 'video',
          url: data.url,
          thumbnailUrl: data.thumbnailUrl, // Include thumbnail URL
        }
      };
    } catch (error) {
      console.error('YouTube posting error:', error);
      return {
        platform: 'youtube',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}