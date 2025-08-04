import { TwitterApi } from 'twitter-api-v2';
import { getUserClient } from './client';

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export interface TwitterCredentials {
  accessToken: string;
  accessSecret: string;
}

export class TwitterService {
  private client: TwitterApi;

  constructor(credentials: TwitterCredentials) {
    this.client = getUserClient(credentials.accessToken, credentials.accessSecret);
  }

  // Verify credentials and get user info
  async verifyCredentials(): Promise<TwitterUser> {
    try {
      const user = await this.client.v2.me({
        'user.fields': ['profile_image_url'],
      });
      
      return {
        id: user.data.id,
        name: user.data.name,
        username: user.data.username,
        profile_image_url: user.data.profile_image_url,
      };
    } catch (error) {
      console.error('Error verifying Twitter credentials:', error);
      throw new Error('Failed to verify Twitter credentials');
    }
  }

  // Post a tweet (Note: Free tier doesn't allow posting)
  async postTweet(text: string, mediaIds?: string[]): Promise<{ id: string; text: string }> {
    try {
      // Check if we can post (requires Basic tier or higher)
      const result = await this.client.v2.tweet({
        text,
        media: mediaIds ? { media_ids: mediaIds } : undefined,
      });

      return {
        id: result.data.id,
        text: result.data.text || text,
      };
    } catch (error: any) {
      if (error.code === 403 || error.data?.detail?.includes('Free')) {
        throw new Error('Posting tweets requires Twitter API Basic tier ($100/month). Free tier only supports reading tweets.');
      }
      console.error('Error posting tweet:', error);
      throw new Error('Failed to post tweet');
    }
  }

  // Upload media (for future use when posting is available)
  async uploadMedia(mediaBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      const mediaId = await this.client.v1.uploadMedia(mediaBuffer, {
        mimeType,
      });
      return mediaId;
    } catch (error) {
      console.error('Error uploading media:', error);
      throw new Error('Failed to upload media');
    }
  }

  // Get user's recent tweets (read-only operation, works on free tier)
  async getUserTweets(userId: string, maxResults: number = 10) {
    try {
      const tweets = await this.client.v2.userTimeline(userId, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics'],
      });
      
      return tweets.data.data || [];
    } catch (error) {
      console.error('Error fetching user tweets:', error);
      throw new Error('Failed to fetch tweets');
    }
  }
}