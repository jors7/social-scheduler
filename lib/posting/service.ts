import { BlueskyService } from '@/lib/bluesky/service';
import { PinterestService } from '@/lib/pinterest/service';
import { InstagramService } from '@/lib/instagram/service';
import { createBrowserClient } from '@supabase/ssr';

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
  tiktokPrivacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'; // TikTok specific - privacy/draft setting
}

export interface PostResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
}

export class PostingService {
  private supabase;

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async postToMultiplePlatforms(
    postData: PostData,
    onProgress?: (platform: string, status: string) => void
  ): Promise<PostResult[]> {
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
          
          const result = await this.postToPlatform(
            platform, 
            content, 
            account, 
            postData.mediaUrls,
            onProgress
          );
          // Add account info to result
          results.push({
            ...result,
            platform: account.account_label 
              ? `${platform} (${account.account_label})`
              : platform
          });
        } catch (error) {
          results.push({
            platform: account.account_label 
              ? `${platform} (${account.account_label})`
              : platform,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
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
    mediaUrls?: string[],
    onProgress?: (platform: string, status: string) => void
  ): Promise<PostResult> {
    // Clean content for text-only platforms
    const textContent = this.cleanHtmlContent(content);
    
    console.log(`Posting to ${platform}:`, {
      originalContent: content,
      cleanedContent: textContent,
      mediaUrls: mediaUrls
    });

    switch (platform) {
      case 'facebook':
        // Facebook integration temporarily disabled
        return {
          platform: 'facebook',
          success: false,
          error: 'Facebook integration is currently being rebuilt. Please check back soon.'
        };
      
      case 'instagram':
        return await this.postToInstagram(
          textContent, 
          account, 
          mediaUrls,
          onProgress ? (status) => onProgress('instagram', status) : undefined
        );
      
      case 'bluesky':
        return await this.postToBluesky(textContent, account, mediaUrls);
      
      case 'pinterest':
        return await this.postToPinterest(textContent, account, mediaUrls);
      
      case 'tiktok':
        return await this.postToTikTok(textContent, account, mediaUrls);
      
      case 'linkedin':
        return await this.postToLinkedIn(textContent, account, mediaUrls);
      
      case 'threads':
        return await this.postToThreads(textContent, account, mediaUrls);
      
      default:
        return {
          platform,
          success: false,
          error: `Posting to ${platform} not implemented yet`
        };
    }
  }


  private async postToInstagram(
    content: string, 
    account: any, 
    mediaUrls?: string[],
    onProgress?: (status: string) => void
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
        };
      } else {
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
      // Pinterest requires at least an image
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new Error('Pinterest requires at least one image');
      }

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
          imageUrl: mediaUrls[0], // Use first image
          link: account.pinterest_link, // Optional destination URL
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Pinterest posting failed');
      }

      return {
        platform: 'pinterest',
        success: true,
        postId: data.id,
      };
    } catch (error) {
      return {
        platform: 'pinterest',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async postToTikTok(content: string, account: any, mediaUrls?: string[]): Promise<PostResult> {
    try {
      // TikTok requires a video
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new Error('TikTok requires a video to post');
      }

      // For now, we'll use the first media URL as the video
      // In a production app, you'd need to verify this is actually a video
      let videoUrl = mediaUrls[0];
      
      // Convert Supabase URL to proxy URL for TikTok domain verification
      if (videoUrl.includes('supabase.co')) {
        // Always use the production URL for TikTok since that's what's verified
        // Use www subdomain as that's where the site is deployed
        const baseUrl = 'https://www.socialcal.app';
        videoUrl = `${baseUrl}/api/media/proxy?url=${encodeURIComponent(videoUrl)}`;
        console.log('Converted video URL for TikTok:', videoUrl);
      }

      // Use privacy level from account (passed from postData) or default to public
      const privacyLevel = account.tiktok_privacy_level || 'PUBLIC_TO_EVERYONE';
      const isDraft = privacyLevel === 'SELF_ONLY';

      const response = await fetch('/api/post/tiktok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: account.access_token,
          content: content,
          videoUrl: videoUrl,
          privacyLevel: privacyLevel,
          options: {
            allowComment: !isDraft,
            allowDuet: !isDraft,
            allowStitch: !isDraft,
            allowDownload: !isDraft,
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'TikTok posting failed');
      }

      return {
        platform: 'tiktok',
        success: true,
        postId: data.publishId,
      };
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
      const response = await fetch('/api/post/linkedin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          mediaUrl: mediaUrls?.[0], // LinkedIn supports one image per post
          mediaType: mediaUrls?.[0] ? 'image' : undefined,
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
}