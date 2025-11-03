import * as crypto from 'crypto';

export interface InstagramCredentials {
  accessToken: string;
  userID: string;
  appSecret?: string; // Instagram app secret for generating appsecret_proof
}

export class InstagramClient {
  private accessToken: string;
  private userID: string;
  private appSecret?: string;
  private baseURL = 'https://graph.instagram.com/v20.0'; // Use Instagram Graph API for Instagram Login tokens!

  constructor(credentials: InstagramCredentials) {
    this.accessToken = credentials.accessToken;
    this.userID = credentials.userID;
    this.appSecret = credentials.appSecret;
    
    // Log token info for debugging (safely)
    console.log('InstagramClient initialized:', {
      userID: this.userID,
      tokenStart: this.accessToken.substring(0, 10),
      tokenEnd: this.accessToken.substring(this.accessToken.length - 4),
      hasAppSecret: !!this.appSecret
    });
  }

  private generateAppSecretProof(): string | undefined {
    if (!this.appSecret) {
      console.warn('No app secret provided, skipping appsecret_proof');
      return undefined;
    }

    const hmac = crypto.createHmac('sha256', this.appSecret);
    hmac.update(this.accessToken);
    const proof = hmac.digest('hex');

    console.log('Generated appsecret_proof:', proof.substring(0, 10) + '...');
    return proof;
  }

  /**
   * Retry helper for transient API errors
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if error is transient
        const errorMessage = error.message || '';
        const isTransient = errorMessage.includes('"is_transient":true') ||
                           errorMessage.includes('Please retry your request later');

        // Only retry on transient errors
        if (!isTransient || attempt === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Transient error detected, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  async getProfile() {
    try {
      // Use Instagram Graph API endpoint for Instagram Login tokens
      const response = await fetch(
        `https://graph.instagram.com/${this.userID}?fields=id,username,media_count,followers_count,follows_count,profile_picture_url,biography&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get profile: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error getting Instagram profile:', error);
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  async createCarouselPost(
    mediaItems: Array<{ url: string; isVideo: boolean }>,
    caption: string,
    onProgress?: (status: string, progress?: number) => void
  ) {
    try {
      if (mediaItems.length < 2 || mediaItems.length > 10) {
        throw new Error('Instagram carousels require 2-10 media items');
      }

      console.log(`Creating Instagram carousel with ${mediaItems.length} items`);
      if (onProgress) {
        onProgress(`Preparing carousel with ${mediaItems.length} items...`);
      }

      // Step 1: Create individual media containers for carousel items
      const containerIds: string[] = [];
      
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        if (onProgress) {
          onProgress(`Uploading item ${i + 1} of ${mediaItems.length}...`, (i / mediaItems.length) * 50);
        }

        const itemParams = new URLSearchParams({
          is_carousel_item: 'true',
          access_token: this.accessToken,
        });

        if (item.isVideo) {
          itemParams.append('media_type', 'REELS');
          itemParams.append('video_url', item.url);
        } else {
          itemParams.append('image_url', item.url);
        }

        console.log(`Creating carousel item ${i + 1}:`, item.isVideo ? 'video' : 'image');

        const itemResponse = await fetch(
          `${this.baseURL}/${this.userID}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: itemParams.toString(),
          }
        );

        if (!itemResponse.ok) {
          const error = await itemResponse.json();
          throw new Error(`Failed to create carousel item ${i + 1}: ${JSON.stringify(error)}`);
        }

        const { id: itemId } = await itemResponse.json();
        containerIds.push(itemId);
        console.log(`Carousel item ${i + 1} created with ID:`, itemId);
      }

      // Step 2: Wait for all video items to process
      const videoIndices = mediaItems
        .map((item, index) => item.isVideo ? index : -1)
        .filter(index => index >= 0);

      if (videoIndices.length > 0) {
        if (onProgress) {
          onProgress(`Processing ${videoIndices.length} video(s) in carousel...`, 60);
        }

        for (const index of videoIndices) {
          await this.waitForMediaProcessing(containerIds[index], onProgress);
        }
      }

      // Step 3: Create carousel container
      if (onProgress) {
        onProgress('Creating carousel post...', 80);
      }

      const carouselParams = new URLSearchParams({
        media_type: 'CAROUSEL',
        children: containerIds.join(','),
        caption: caption,
        access_token: this.accessToken,
      });

      console.log('Creating carousel container with children:', containerIds);

      const carouselResponse = await fetch(
        `${this.baseURL}/${this.userID}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: carouselParams.toString(),
        }
      );

      if (!carouselResponse.ok) {
        const error = await carouselResponse.json();
        throw new Error(`Failed to create carousel container: ${JSON.stringify(error)}`);
      }

      const { id: carouselId } = await carouselResponse.json();
      console.log('Carousel container created with ID:', carouselId);

      // Step 4: Publish carousel
      if (onProgress) {
        onProgress('Publishing carousel...', 95);
      }

      const publishParams = new URLSearchParams({
        creation_id: carouselId,
        access_token: this.accessToken,
      });

      const publishResponse = await fetch(
        `${this.baseURL}/${this.userID}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: publishParams.toString(),
        }
      );

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        throw new Error(`Failed to publish carousel: ${JSON.stringify(error)}`);
      }

      const result = await publishResponse.json();
      console.log('Instagram carousel published successfully:', result);
      return result;
    } catch (error: any) {
      console.error('Error creating Instagram carousel:', error);
      throw new Error(`Failed to create carousel: ${error.message}`);
    }
  }

  private async waitForMediaProcessing(
    containerId: string,
    onProgress?: (status: string, progress?: number) => void
  ) {
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts with 2 second delays = 2 minutes max per video
    
    while (attempts < maxAttempts) {
      attempts++;
      
      const statusUrl = `${this.baseURL}/${containerId}?fields=status_code&access_token=${this.accessToken}`;
      const statusResponse = await fetch(statusUrl);
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        
        if (statusData.status_code === 'FINISHED') {
          return; // Processing complete
        } else if (statusData.status_code === 'ERROR') {
          throw new Error(`Media processing failed: ${JSON.stringify(statusData)}`);
        }
        
        // Still processing
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.warn('Failed to check media status');
        break;
      }
    }
  }

  async createPost(
    mediaUrl: string,
    caption: string,
    isVideo: boolean = false,
    onProgress?: (status: string, progress?: number) => void
  ) {
    try {
      console.log('Creating Instagram post with:', {
        userID: this.userID,
        mediaUrl: mediaUrl,
        captionLength: caption.length,
        isVideo: isVideo,
        tokenType: this.accessToken.substring(0, 4) // Should be IGAA for Instagram Login
      });

      // Step 1: Create media container
      // For Instagram Login tokens (IGAA...), we use graph.instagram.com WITHOUT appsecret_proof
      const containerParams = new URLSearchParams({
        caption: caption,
        access_token: this.accessToken,
      });

      if (isVideo) {
        // For videos/reels
        containerParams.append('media_type', 'REELS');
        containerParams.append('video_url', mediaUrl);
      } else {
        // For images
        containerParams.append('image_url', mediaUrl);
      }

      // Do NOT add appsecret_proof for graph.instagram.com calls
      // appsecret_proof is only for graph.facebook.com

      console.log('Container API call to:', `${this.baseURL}/${this.userID}/media`);
      console.log('Media type:', isVideo ? 'REELS' : 'IMAGE');

      // Report progress
      if (onProgress) {
        onProgress(isVideo ? 'Uploading video to Instagram...' : 'Uploading image to Instagram...');
      }

      // Use retry logic for container creation (handles transient errors)
      const { id: creationId } = await this.retryWithBackoff(async () => {
        const containerResponse = await fetch(
          `${this.baseURL}/${this.userID}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: containerParams.toString(),
          }
        );

        console.log('Container response status:', containerResponse.status);

        if (!containerResponse.ok) {
          const error = await containerResponse.json();
          console.error('Container creation failed:', error);
          throw new Error(`Failed to create media container: ${JSON.stringify(error)}`);
        }

        return containerResponse.json();
      });
      console.log('Media container created with ID:', creationId);

      // Wait for media processing to complete (both images and videos need time)
      console.log('Checking media processing status...');

      if (onProgress) {
        onProgress(isVideo ? 'Processing video... This may take a moment.' : 'Processing image...');
      }

      // Wait for media to be processed (check status)
      let attempts = 0;
      const maxAttempts = isVideo ? 120 : 30; // 4 minutes for video, 1 minute for images
      let isReady = false;
      const startTime = Date.now();

      while (attempts < maxAttempts && !isReady) {
        attempts++;

        // Check container status
        const statusUrl = `${this.baseURL}/${creationId}?fields=status,status_code&access_token=${this.accessToken}`;
        const statusResponse = await fetch(statusUrl);

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log(`Status check ${attempts}:`, statusData);

          if (statusData.status_code === 'FINISHED') {
            isReady = true;
            console.log('Media processing complete!');
            if (onProgress) {
              onProgress(isVideo ? 'Video processed! Publishing...' : 'Image processed! Publishing...');
            }
          } else if (statusData.status_code === 'ERROR') {
            throw new Error(`Media processing failed: ${JSON.stringify(statusData)}`);
          } else {
            // Still processing, wait 2 seconds
            console.log(`Media still processing... (${statusData.status_code || 'IN_PROGRESS'})`);

            // Calculate elapsed time and progress
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            const estimatedProgress = Math.min(90, (attempts / maxAttempts) * 90); // Cap at 90% until actually finished

            if (onProgress) {
              if (isVideo) {
                if (elapsedSeconds < 15) {
                  onProgress(`Processing video... (${elapsedSeconds}s)`, estimatedProgress);
                } else if (elapsedSeconds < 30) {
                  onProgress(`Processing video... Please wait (${elapsedSeconds}s)`, estimatedProgress);
                } else if (elapsedSeconds < 60) {
                  onProgress(`Processing video... This may take 2-3 minutes (${elapsedSeconds}s)`, estimatedProgress);
                } else if (elapsedSeconds < 120) {
                  onProgress(`Processing HD video... Still working (${Math.floor(elapsedSeconds/60)}m ${elapsedSeconds%60}s)`, estimatedProgress);
                } else if (elapsedSeconds < 180) {
                  onProgress(`Processing large video... Please be patient (${Math.floor(elapsedSeconds/60)}m ${elapsedSeconds%60}s)`, estimatedProgress);
                } else {
                  onProgress(`Still processing... Almost done (${Math.floor(elapsedSeconds/60)}m ${elapsedSeconds%60}s)`, estimatedProgress);
                }
              } else {
                // Image processing (usually faster)
                if (elapsedSeconds < 10) {
                  onProgress(`Processing image... (${elapsedSeconds}s)`, estimatedProgress);
                } else if (elapsedSeconds < 30) {
                  onProgress(`Processing image... Please wait (${elapsedSeconds}s)`, estimatedProgress);
                } else {
                  onProgress(`Processing image... Almost ready (${elapsedSeconds}s)`, estimatedProgress);
                }
              }
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else {
          console.warn('Failed to check status, proceeding anyway');
          break;
        }
      }

      if (!isReady && attempts >= maxAttempts) {
        const mediaType = isVideo ? 'Video' : 'Image';
        const timeout = isVideo ? '4 minutes' : '1 minute';
        console.warn(`${mediaType} processing timeout after ${timeout}, attempting to publish anyway...`);
        if (onProgress) {
          onProgress(`Processing taking unusually long. Attempting to publish - this may still succeed.`);
        }
      }

      // Step 2: Publish the media
      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: this.accessToken,
      });

      // Do NOT add appsecret_proof for graph.instagram.com calls

      console.log('Publishing media container...');

      if (onProgress) {
        onProgress(isVideo ? 'Publishing your reel...' : 'Publishing your post...', 95);
      }

      // Use retry logic for publish step (handles transient errors)
      const result = await this.retryWithBackoff(async () => {
        const publishResponse = await fetch(
          `${this.baseURL}/${this.userID}/media_publish`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: publishParams.toString(),
          }
        );

        console.log('Publish response status:', publishResponse.status);

        if (!publishResponse.ok) {
          const error = await publishResponse.json();
          console.error('Media publish failed:', error);
          throw new Error(`Failed to publish media: ${JSON.stringify(error)}`);
        }

        return publishResponse.json();
      });
      console.log('Instagram post published successfully:', result);

      return result;
    } catch (error: any) {
      console.error('Error creating Instagram post:', error);
      throw new Error(`Failed to create post: ${error.message}`);
    }
  }

  async getMedia(limit = 10) {
    try {
      // Use Instagram Graph API endpoint - include like_count, comments_count, and thumbnail_url for videos
      const response = await fetch(
        `https://graph.instagram.com/${this.userID}/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count&limit=${limit}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get media: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error getting Instagram media:', error);
      throw new Error(`Failed to get media: ${error.message}`);
    }
  }

  async verifyCredentials() {
    try {
      const profile = await this.getProfile();
      return {
        id: profile.id,
        username: profile.username,
        profilePictureUrl: profile.profile_picture_url,
        biography: profile.biography,
        mediaCount: profile.media_count,
        followersCount: profile.followers_count,
        followsCount: profile.follows_count,
      };
    } catch (error: any) {
      console.error('Error verifying Instagram credentials:', error);
      throw new Error(`Verification failed: ${error.message}`);
    }
  }

  async createStory(
    mediaUrl: string,
    isVideo: boolean = false,
    onProgress?: (status: string, progress?: number) => void
  ) {
    try {
      console.log('Creating Instagram story with:', {
        userID: this.userID,
        mediaUrl: mediaUrl,
        isVideo: isVideo,
      });

      // Step 1: Create story media container
      const containerParams = new URLSearchParams({
        access_token: this.accessToken,
      });

      if (isVideo) {
        // For video stories
        containerParams.append('media_type', 'STORIES');
        containerParams.append('video_url', mediaUrl);
      } else {
        // For image stories
        containerParams.append('media_type', 'STORIES');
        containerParams.append('image_url', mediaUrl);
      }

      console.log('Creating story container...');
      
      if (onProgress) {
        onProgress(isVideo ? 'Uploading video story...' : 'Uploading image story...', 20);
      }
      
      const containerResponse = await fetch(
        `${this.baseURL}/${this.userID}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: containerParams.toString(),
        }
      );

      if (!containerResponse.ok) {
        const error = await containerResponse.json();
        console.error('Story container creation failed:', error);
        throw new Error(`Failed to create story container: ${JSON.stringify(error)}`);
      }

      const { id: creationId } = await containerResponse.json();
      console.log('Story container created with ID:', creationId);

      // Wait for media processing (both images and videos need time)
      console.log('Waiting for story media to be ready...');

      if (onProgress) {
        onProgress(isVideo ? 'Processing video story...' : 'Processing image story...', 50);
      }

      // Add a small delay before checking status (Instagram needs time to register the media)
      await new Promise(resolve => setTimeout(resolve, 2000));

      await this.waitForMediaProcessing(creationId, onProgress);

      // Step 2: Publish the story
      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: this.accessToken,
      });

      console.log('Publishing story...');
      
      if (onProgress) {
        onProgress('Publishing your story...', 90);
      }
      
      const publishResponse = await fetch(
        `${this.baseURL}/${this.userID}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: publishParams.toString(),
        }
      );

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        console.error('Story publish failed:', error);
        throw new Error(`Failed to publish story: ${JSON.stringify(error)}`);
      }

      const result = await publishResponse.json();
      console.log('Instagram story published successfully:', result);
      return result;
    } catch (error: any) {
      console.error('Error creating Instagram story:', error);
      throw new Error(`Failed to create story: ${error.message}`);
    }
  }

  async getMediaInsights(mediaId: string, metrics?: string[], mediaType?: string) {
    try {
      // For photos (IMAGE type), try individual metrics to avoid API errors
      // Instagram API can be picky about which metrics are requested together
      let metricsToTry: string[];

      if (mediaType === 'REELS') {
        // Metrics for Reels - comprehensive set
        metricsToTry = ['plays', 'reach', 'likes', 'comments', 'shares', 'saves', 'total_interactions'];
      } else if (mediaType === 'VIDEO') {
        // Metrics for regular videos (impressions deprecated April 2025)
        metricsToTry = ['reach', 'saved', 'likes', 'comments', 'shares', 'total_interactions'];
      } else if (mediaType === 'CAROUSEL_ALBUM') {
        // Metrics for Carousel posts (impressions deprecated April 2025)
        metricsToTry = ['reach', 'saved', 'likes', 'comments', 'shares', 'total_interactions'];
      } else {
        // For IMAGE posts - standard supported metrics (impressions deprecated April 2025)
        metricsToTry = ['reach', 'saved', 'likes', 'comments', 'shares', 'total_interactions'];
      }

      // Use the metrics as specified or fallback to defaults
      let metricsToFetch = metrics || metricsToTry;
      const metricsParam = metricsToFetch.join(',');

      console.log(`Fetching insights for media ${mediaId}:`, metricsToFetch);

      const response = await fetch(
        `${this.baseURL}/${mediaId}/insights?metric=${metricsParam}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error?.message?.toLowerCase() || '';

        console.error('Failed to fetch media insights:', error);
        console.log('Error message check:', {
          errorMessage,
          hasDoesNotSupport: errorMessage.includes('does not support'),
          hasImpressions: errorMessage.includes('impressions'),
          willTryIndividual: errorMessage.includes('does not support') && errorMessage.includes('impressions')
        });

        // Check if it's an impressions error - try individual metrics
        if (errorMessage.includes('does not support') && errorMessage.includes('impressions')) {
          console.log('🔄 Impressions not supported, trying individual metrics...');
          return await this.getMediaInsightsIndividually(mediaId, metricsToFetch);
        }

        // Handle various Instagram API error codes
        if (error.error?.code === 100) {
          // This can mean multiple things
          if (errorMessage.includes('not supported for instagram business')) {
            console.log('Account needs Instagram Business/Creator account for insights');
          } else if (errorMessage.includes('invalid parameter') || errorMessage.includes('unsupported get request')) {
            console.log('Insights API not available - may need Business account or proper permissions');
          } else if (errorMessage.includes('media posted before')) {
            console.log('Insights not available for old posts (before business account conversion)');
          } else {
            console.log('Insights not available:', errorMessage);
          }

          // Return empty data structure so the UI can still work
          return {
            data: metricsToFetch.map(metric => ({
              name: metric,
              period: 'lifetime',
              values: [{ value: 0 }],
              description: `${metric} count`,
            })),
          };
        }

        // Handle permission errors
        if (error.error?.code === 10) {
          console.log('Permission denied for insights - app may need instagram_manage_insights permission');
          return {
            data: metricsToFetch.map(metric => ({
              name: metric,
              period: 'lifetime',
              values: [{ value: 0 }],
              description: `${metric} count`,
            })),
          };
        }

        // Handle rate limiting
        if (error.error?.code === 4 || error.error?.code === 32) {
          console.log('Rate limited by Instagram API');
          return {
            data: metricsToFetch.map(metric => ({
              name: metric,
              period: 'lifetime',
              values: [{ value: 0 }],
              description: `${metric} count`,
            })),
          };
        }

        throw new Error(`Failed to fetch insights: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      console.log('Media insights fetched:', {
        mediaId,
        metrics: data.data?.map((m: any) => ({
          name: m.name,
          value: m.values?.[0]?.value
        }))
      });
      return data;
    } catch (error: any) {
      console.error('Error fetching Instagram insights:', error);

      // Check if error message contains "does not support the impressions metric"
      if (error.message && error.message.includes('does not support') && error.message.includes('impressions')) {
        console.log('Caught impressions error, trying individual metrics...');
        const metricsToFetch = metrics || ['impressions', 'reach', 'saved', 'shares', 'total_interactions'];
        return await this.getMediaInsightsIndividually(mediaId, metricsToFetch);
      }

      // Return empty structure instead of throwing to prevent UI breakage
      console.log('Returning default empty insights due to error');
      const defaultMetrics = metrics || [
        'impressions',
        'reach',
        'saved',
        'shares',
        'total_interactions'
      ];

      return {
        data: defaultMetrics.map(metric => ({
          name: metric,
          period: 'lifetime',
          values: [{ value: 0 }],
          description: `${metric} count`,
        })),
      };
    }
  }

  private async getMediaInsightsIndividually(mediaId: string, metrics: string[]) {
    console.log(`Fetching metrics individually for media ${mediaId}`);
    const results: any[] = [];

    // Try each metric individually
    for (const metric of metrics) {
      try {
        const response = await fetch(
          `${this.baseURL}/${mediaId}/insights?metric=${metric}&access_token=${this.accessToken}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.data && Array.isArray(data.data)) {
            results.push(...data.data);
            console.log(`✓ Fetched ${metric}:`, data.data[0]?.values?.[0]?.value || 0);
          }
        } else {
          console.log(`✗ Metric ${metric} not available for this media`);
          // Add zero value for unavailable metrics
          results.push({
            name: metric,
            period: 'lifetime',
            values: [{ value: 0 }],
            description: `${metric} count`,
          });
        }
      } catch (err) {
        console.log(`✗ Error fetching ${metric}:`, err);
        results.push({
          name: metric,
          period: 'lifetime',
          values: [{ value: 0 }],
          description: `${metric} count`,
        });
      }
    }

    return { data: results };
  }

  async getUserInsights(period: 'day' | 'week' | 'days_28' = 'days_28', metrics?: string[]) {
    try {
      // Instagram account metrics (impressions deprecated April 2025)
      // Universal metrics that work for BUSINESS, CREATOR, and MEDIA_CREATOR accounts
      const defaultMetrics = [
        'reach',
        'profile_views',
        'follower_count',
        'accounts_engaged',
        'total_interactions'
      ];

      const metricsToFetch = metrics || defaultMetrics;
      const metricsParam = metricsToFetch.join(',');

      console.log(`Fetching user insights for period ${period}:`, metricsToFetch);

      const response = await fetch(
        `${this.baseURL}/${this.userID}/insights?metric=${metricsParam}&period=${period}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to fetch user insights:', error);

        // Handle various error cases
        if (error.error?.code === 100) {
          const errorMessage = error.error?.message?.toLowerCase() || '';

          if (errorMessage.includes('not supported') || errorMessage.includes('business')) {
            console.log('User insights require Instagram Business/Creator account');
          } else {
            console.log('User insights not available:', errorMessage);
          }

          // Return empty data structure
          return {
            data: metricsToFetch.map(metric => ({
              name: metric,
              period: period,
              values: [{ value: 0 }],
              description: `${metric} count`,
            })),
          };
        }

        // Handle permission errors
        if (error.error?.code === 10) {
          console.log('Permission denied for user insights - app needs instagram_manage_insights permission');
          return {
            data: metricsToFetch.map(metric => ({
              name: metric,
              period: period,
              values: [{ value: 0 }],
              description: `${metric} count`,
            })),
          };
        }

        throw new Error(`Failed to fetch user insights: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      console.log('User insights fetched:', data);
      return data;
    } catch (error: any) {
      console.error('Error fetching Instagram user insights:', error);

      // Return empty structure instead of throwing
      const defaultMetrics = metrics || [
        'reach',
        'follower_count',
        'profile_views',
        'website_clicks'
      ];

      return {
        data: defaultMetrics.map(metric => ({
          name: metric,
          period: period,
          values: [{ value: 0 }],
          description: `${metric} count`,
        })),
      };
    }
  }

  async getStoryInsights(storyId: string) {
    try {
      // Story-specific metrics
      const storyMetrics = [
        'exits',
        'impressions',
        'reach',
        'replies',
        'taps_forward',
        'taps_back'
      ];
      
      console.log(`Fetching insights for story ${storyId}`);
      
      const response = await fetch(
        `${this.baseURL}/${storyId}/insights?metric=${storyMetrics.join(',')}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to fetch story insights:', error);
        
        // Stories insights might not be available immediately
        if (error.error?.code === 100) {
          console.log('Story insights not yet available');
          return {
            data: storyMetrics.map(metric => ({
              name: metric,
              period: 'lifetime',
              values: [{ value: 0 }],
              description: `${metric} count for story`,
            })),
          };
        }
        
        throw new Error(`Failed to fetch story insights: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      console.log('Story insights fetched:', data);
      return data;
    } catch (error: any) {
      console.error('Error fetching Instagram story insights:', error);
      throw new Error(`Failed to fetch story insights: ${error.message}`);
    }
  }

  async getAccountInfo() {
    try {
      const response = await fetch(
        `${this.baseURL}/${this.userID}?fields=id,username,name,account_type,media_count,followers_count,follows_count&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to fetch account info:', error);
        throw new Error(error.error?.message || 'Failed to fetch account info');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Instagram account info:', error);
      throw error;
    }
  }

  async createReel(
    videoUrl: string,
    caption: string,
    onProgress?: (status: string, progress?: number) => void
  ) {
    // Reels are just videos with REELS media type, which is what createPost already does for videos
    console.log('Creating Instagram reel with:', {
      userID: this.userID,
      videoUrl: videoUrl.substring(0, 50) + '...',
      captionLength: caption.length
    });

    return this.createPost(videoUrl, caption, true, onProgress);
  }
}