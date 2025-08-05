import { FacebookService } from '@/lib/facebook/service';
import { BlueskyService } from '@/lib/bluesky/service';
import { createBrowserClient } from '@supabase/ssr';

export interface PostData {
  content: string;
  platforms: string[];
  platformContent?: Record<string, string>;
  scheduledFor?: Date;
  mediaUrls?: string[];
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

  async postToMultiplePlatforms(postData: PostData): Promise<PostResult[]> {
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
      const account = accounts?.find(acc => acc.platform === platform);
      
      if (!account) {
        results.push({
          platform,
          success: false,
          error: `${platform} account not connected`
        });
        continue;
      }

      try {
        const content = postData.platformContent?.[platform] || postData.content;
        const result = await this.postToPlatform(platform, content, account, postData.mediaUrls);
        results.push(result);
      } catch (error) {
        results.push({
          platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  private async postToPlatform(platform: string, content: string, account: any, mediaUrls?: string[]): Promise<PostResult> {
    // Clean content for text-only platforms
    const textContent = this.cleanHtmlContent(content);
    
    console.log(`Posting to ${platform}:`, {
      originalContent: content,
      cleanedContent: textContent,
      mediaUrls: mediaUrls
    });

    switch (platform) {
      case 'facebook':
        return await this.postToFacebook(textContent, account, mediaUrls);
      
      case 'bluesky':
        return await this.postToBluesky(textContent, account, mediaUrls);
      
      default:
        return {
          platform,
          success: false,
          error: `Posting to ${platform} not implemented yet`
        };
    }
  }

  private async postToFacebook(content: string, account: any, mediaUrls?: string[]): Promise<PostResult> {
    try {
      const response = await fetch('/api/post/facebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId: account.platform_user_id,
          pageAccessToken: account.access_token,
          message: content,
          mediaUrls: mediaUrls,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Facebook posting failed');
      }

      return {
        platform: 'facebook',
        success: true,
        postId: data.id,
      };
    } catch (error) {
      return {
        platform: 'facebook',
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
}