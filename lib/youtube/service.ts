import { google, youtube_v3 } from 'googleapis';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Readable } from 'stream';
import { createVideoResource, parseYouTubeError, generateYouTubeUrl } from './upload';

export class YouTubeService {
  private youtube: youtube_v3.Youtube;
  private oauth2Client: any;
  private userId?: string;

  constructor(accessToken: string, refreshToken?: string, userId?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Set up token refresh handler
    this.oauth2Client.on('tokens', async (tokens: any) => {
      console.log('YouTube tokens refreshed');
      if (tokens.refresh_token) {
        // Store the new refresh token
        if (this.userId) {
          await this.updateStoredTokens(tokens.access_token, tokens.refresh_token);
        }
      } else if (tokens.access_token) {
        // Store the new access token
        if (this.userId) {
          await this.updateStoredTokens(tokens.access_token);
        }
      }
    });

    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });
    
    this.userId = userId;
  }

  /**
   * Update stored tokens in database
   */
  private async updateStoredTokens(accessToken: string, refreshToken?: string) {
    if (!this.userId) return;
    
    try {
      const { createServerClient } = await import('@supabase/ssr');
      const { cookies } = await import('next/headers');
      
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

      const updateData: any = { 
        access_token: accessToken,
        updated_at: new Date().toISOString()
      };
      
      if (refreshToken) {
        updateData.refresh_token = refreshToken;
      }

      await supabase
        .from('social_accounts')
        .update(updateData)
        .eq('user_id', this.userId)
        .eq('platform', 'youtube');
        
      console.log('Updated YouTube tokens in database');
    } catch (error) {
      console.error('Failed to update YouTube tokens:', error);
    }
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
    videoStream?: Readable;
    thumbnailPath?: string;
    thumbnailBuffer?: Buffer;
    onProgress?: (progress: number) => void;
  }) {
    try {
      const requestBody = createVideoResource({
        title: params.title,
        description: params.description,
        tags: params.tags,
        categoryId: params.categoryId,
        privacyStatus: params.privacyStatus,
      });

      let videoStream: Readable;
      
      // Determine the video source
      if (params.videoStream) {
        videoStream = params.videoStream;
      } else if (params.videoBuffer) {
        videoStream = Readable.from(params.videoBuffer);
      } else if (params.videoPath) {
        // If it's a URL, fetch it first
        if (params.videoPath.startsWith('http')) {
          const response = await fetch(params.videoPath);
          const buffer = Buffer.from(await response.arrayBuffer());
          videoStream = Readable.from(buffer);
        } else {
          // For local file paths (not recommended in production)
          throw new Error('Local file paths are not supported. Please provide a buffer or stream.');
        }
      } else {
        throw new Error('No video source provided');
      }

      // Upload video with resumable upload
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status', 'contentDetails'],
        requestBody,
        media: {
          body: videoStream,
        },
        // Enable resumable upload for large files
        uploadType: 'resumable',
      });

      // If thumbnail is provided, upload it
      if ((params.thumbnailPath || params.thumbnailBuffer) && response.data.id) {
        try {
          let thumbnailStream: Readable;
          
          if (params.thumbnailBuffer) {
            thumbnailStream = Readable.from(params.thumbnailBuffer);
          } else if (params.thumbnailPath) {
            if (params.thumbnailPath.startsWith('http')) {
              const response = await fetch(params.thumbnailPath);
              const buffer = Buffer.from(await response.arrayBuffer());
              thumbnailStream = Readable.from(buffer);
            } else {
              throw new Error('Local file paths are not supported for thumbnails.');
            }
          } else {
            throw new Error('No thumbnail source provided');
          }

          await this.youtube.thumbnails.set({
            videoId: response.data.id,
            media: {
              body: thumbnailStream,
            },
          });
        } catch (thumbnailError) {
          console.warn('Failed to upload thumbnail:', thumbnailError);
          // Don't fail the entire upload if thumbnail fails
        }
      }

      return {
        id: response.data.id,
        url: generateYouTubeUrl(response.data.id!),
        title: response.data.snippet?.title,
        description: response.data.snippet?.description,
        publishedAt: response.data.snippet?.publishedAt,
        status: response.data.status,
      };
    } catch (error) {
      console.error('Error uploading video to YouTube:', error);
      const errorMessage = parseYouTubeError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Upload a video from a URL
   */
  async uploadVideoFromUrl(videoUrl: string, params: {
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus?: 'private' | 'public' | 'unlisted';
    thumbnailUrl?: string;
  }) {
    try {
      // Fetch video from URL
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
      }
      
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      
      // Fetch thumbnail if provided
      let thumbnailBuffer: Buffer | undefined;
      if (params.thumbnailUrl) {
        const thumbnailResponse = await fetch(params.thumbnailUrl);
        if (thumbnailResponse.ok) {
          thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer());
        }
      }
      
      return this.uploadVideo({
        ...params,
        videoBuffer,
        thumbnailBuffer,
      });
    } catch (error) {
      console.error('Error uploading video from URL:', error);
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

  return new YouTubeService(account.access_token, account.refresh_token, userId);
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