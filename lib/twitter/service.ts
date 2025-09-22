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

  // Post a tweet
  async postTweet(text: string, mediaIds?: string[]): Promise<{ id: string; text: string }> {
    try {
      const tweetData: any = { text };
      if (mediaIds && mediaIds.length > 0) {
        tweetData.media = { 
          media_ids: mediaIds.slice(0, 4) as [string] | [string, string] | [string, string, string] | [string, string, string, string]
        };
      }
      
      const result = await this.client.v2.tweet(tweetData);

      return {
        id: result.data.id,
        text: result.data.text || text,
      };
    } catch (error: any) {
      console.error('Error posting tweet:', error);
      
      // Check for rate limit errors
      if (error.code === 429) {
        throw new Error('Twitter rate limit exceeded. Please try again later.');
      }
      
      // Check for authentication errors
      if (error.code === 401) {
        throw new Error('Twitter authentication failed. Please reconnect your account.');
      }
      
      // Generic error
      throw new Error('Failed to post tweet. Please try again.');
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

  // Post a thread (multiple connected tweets)
  async postThread(tweets: string[], mediaIds?: string[][]): Promise<{ ids: string[]; urls: string[] }> {
    const postedTweets: { id: string; text: string }[] = [];
    const tweetUrls: string[] = [];
    
    try {
      // Get the user info for constructing URLs
      const user = await this.verifyCredentials();
      
      // Post the first tweet
      const firstTweetData: any = { text: tweets[0] };
      if (mediaIds && mediaIds[0] && mediaIds[0].length > 0) {
        firstTweetData.media = { 
          media_ids: mediaIds[0].slice(0, 4) as [string] | [string, string] | [string, string, string] | [string, string, string, string]
        };
      }
      
      console.log('Posting first tweet of thread...');
      const firstTweet = await this.client.v2.tweet(firstTweetData);
      postedTweets.push({
        id: firstTweet.data.id,
        text: firstTweet.data.text || tweets[0]
      });
      tweetUrls.push(`https://twitter.com/${user.username}/status/${firstTweet.data.id}`);
      
      // Post the remaining tweets as replies
      let previousTweetId = firstTweet.data.id;
      
      for (let i = 1; i < tweets.length; i++) {
        const tweetData: any = { 
          text: tweets[i],
          reply: {
            in_reply_to_tweet_id: previousTweetId
          }
        };
        
        // Add media if provided for this tweet
        if (mediaIds && mediaIds[i] && mediaIds[i].length > 0) {
          tweetData.media = { 
            media_ids: mediaIds[i].slice(0, 4) as [string] | [string, string] | [string, string, string] | [string, string, string, string]
          };
        }
        
        console.log(`Posting tweet ${i + 1}/${tweets.length} as reply to ${previousTweetId}...`);
        const replyTweet = await this.client.v2.tweet(tweetData);
        
        postedTweets.push({
          id: replyTweet.data.id,
          text: replyTweet.data.text || tweets[i]
        });
        tweetUrls.push(`https://twitter.com/${user.username}/status/${replyTweet.data.id}`);
        
        previousTweetId = replyTweet.data.id;
      }
      
      console.log(`Successfully posted thread with ${postedTweets.length} tweets`);
      
      return {
        ids: postedTweets.map(t => t.id),
        urls: tweetUrls
      };
    } catch (error: any) {
      console.error('Error posting thread:', error);
      
      // Check for rate limit errors
      if (error.code === 429) {
        throw new Error('Twitter rate limit exceeded. Please try again later.');
      }
      
      // Check for authentication errors
      if (error.code === 401) {
        throw new Error('Twitter authentication failed. Please reconnect your account.');
      }
      
      // If we've posted some tweets, include that info in the error
      if (postedTweets.length > 0) {
        throw new Error(`Thread partially posted (${postedTweets.length}/${tweets.length} tweets). Error: ${error.message}`);
      }
      
      throw new Error('Failed to post thread. Please try again.');
    }
  }
}