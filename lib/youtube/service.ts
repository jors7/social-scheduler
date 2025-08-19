import { google, youtube_v3 } from 'googleapis';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export class YouTubeService {
  private youtube: youtube_v3.Youtube;
  private oauth2Client: any;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  /**
   * Get user's YouTube channels
   */
  async getChannels() {
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        mine: true,
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching YouTube channels:', error);
      throw error;
    }
  }

  /**
   * Upload a video to YouTube
   */
  async uploadVideo(params: {
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus?: 'private' | 'public' | 'unlisted';
    videoPath?: string;
    videoBuffer?: Buffer;
    thumbnailPath?: string;
  }) {
    try {
      const requestBody: youtube_v3.Schema$Video = {
        snippet: {
          title: params.title,
          description: params.description,
          tags: params.tags,
          categoryId: params.categoryId || '22', // Default to People & Blogs
        },
        status: {
          privacyStatus: params.privacyStatus || 'private',
          selfDeclaredMadeForKids: false,
        },
      };

      // For actual video upload, we'd need to handle file streams
      // This is a placeholder for the video upload logic
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody,
        media: {
          body: params.videoBuffer || params.videoPath, // This would need proper stream handling
        },
      });

      // If thumbnail is provided, upload it
      if (params.thumbnailPath && response.data.id) {
        await this.youtube.thumbnails.set({
          videoId: response.data.id,
          media: {
            body: params.thumbnailPath, // This would need proper stream handling
          },
        });
      }

      return {
        id: response.data.id,
        url: `https://www.youtube.com/watch?v=${response.data.id}`,
        title: response.data.snippet?.title,
        description: response.data.snippet?.description,
      };
    } catch (error) {
      console.error('Error uploading video to YouTube:', error);
      throw error;
    }
  }

  /**
   * Create a YouTube post (Community post)
   * Note: This requires YouTube Community API access which may be limited
   */
  async createPost(params: {
    text: string;
    imageUrl?: string;
  }) {
    // YouTube Community posts API is limited and requires special access
    // For now, this is a placeholder
    throw new Error('YouTube Community posts are not yet supported. Please upload a video instead.');
  }

  /**
   * Get video categories
   */
  async getVideoCategories(regionCode: string = 'US') {
    try {
      const response = await this.youtube.videoCategories.list({
        part: ['snippet'],
        regionCode,
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching video categories:', error);
      throw error;
    }
  }

  /**
   * Get channel statistics
   */
  async getChannelStats() {
    try {
      const response = await this.youtube.channels.list({
        part: ['statistics'],
        mine: true,
      });

      return response.data.items?.[0]?.statistics || null;
    } catch (error) {
      console.error('Error fetching channel stats:', error);
      throw error;
    }
  }
}

/**
 * Helper function to get YouTube service for a user
 */
export async function getUserYouTubeService(userId: string) {
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

  // Get YouTube account
  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .eq('platform', 'youtube')
    .eq('is_active', true)
    .single();

  if (error || !account) {
    throw new Error('YouTube account not connected');
  }

  return new YouTubeService(account.access_token, account.refresh_token);
}

/**
 * Format content for YouTube
 */
export function formatYouTubeContent(content: string, title?: string): { 
  title: string; 
  description: string;
  tags: string[];
} {
  // YouTube has a 100 character limit for titles and 5000 for descriptions
  const maxTitleLength = 100;
  const maxDescriptionLength = 5000;
  
  // Clean HTML and format content
  const cleanContent = content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // Generate title if not provided
  const videoTitle = title || cleanContent.split('\n')[0].substring(0, maxTitleLength) || 'New Video';
  
  // Truncate title if needed
  let finalTitle = videoTitle;
  if (finalTitle.length > maxTitleLength) {
    finalTitle = finalTitle.substring(0, maxTitleLength - 3) + '...';
  }

  // Truncate description if needed
  let description = cleanContent;
  if (description.length > maxDescriptionLength) {
    description = description.substring(0, maxDescriptionLength - 3) + '...';
  }

  // Extract hashtags as tags
  const tags = cleanContent.match(/#\w+/g)?.map(tag => tag.substring(1)) || [];

  return {
    title: finalTitle,
    description,
    tags,
  };
}