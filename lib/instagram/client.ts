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

      const { id: creationId } = await containerResponse.json();
      console.log('Media container created with ID:', creationId);

      // For videos, we need to wait for processing to complete
      if (isVideo) {
        console.log('Video detected, checking processing status...');
        
        if (onProgress) {
          onProgress('Processing video... This may take a moment.');
        }
        
        // Wait for video to be processed (check status)
        let attempts = 0;
        const maxAttempts = 120; // 120 attempts with 2 second delays = ~240 seconds (4 minutes) max
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
              console.log('Video processing complete!');
              if (onProgress) {
                onProgress('Video processed! Publishing...');
              }
            } else if (statusData.status_code === 'ERROR') {
              throw new Error(`Video processing failed: ${JSON.stringify(statusData)}`);
            } else {
              // Still processing, wait 2 seconds
              console.log(`Video still processing... (${statusData.status_code || 'IN_PROGRESS'})`);
              
              // Calculate elapsed time and progress
              const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
              const estimatedProgress = Math.min(90, (attempts / maxAttempts) * 90); // Cap at 90% until actually finished
              
              if (onProgress) {
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
              }
              
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } else {
            console.warn('Failed to check status, proceeding anyway');
            break;
          }
        }
        
        if (!isReady && attempts >= maxAttempts) {
          console.warn('Video processing timeout after 4 minutes, attempting to publish anyway...');
          if (onProgress) {
            onProgress('Processing taking unusually long. Attempting to publish - this may still succeed.');
          }
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

      const result = await publishResponse.json();
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

      // For video stories, wait for processing
      if (isVideo) {
        console.log('Video story detected, checking processing status...');
        
        if (onProgress) {
          onProgress('Processing video story...', 50);
        }
        
        await this.waitForMediaProcessing(creationId, onProgress);
      }

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

  async getMediaInsights(mediaId: string, metrics?: string[]) {
    try {
      // Default metrics if not specified - only use metrics available through insights API
      // Note: likes and comments are fetched directly from media object, not insights
      const defaultMetrics = [
        'impressions',
        'reach',
        'saved',
        'shares',
        'total_interactions'
      ];
      
      const metricsToFetch = metrics || defaultMetrics;
      const metricsParam = metricsToFetch.join(',');
      
      console.log(`Fetching insights for media ${mediaId}:`, metricsToFetch);
      
      const response = await fetch(
        `${this.baseURL}/${mediaId}/insights?metric=${metricsParam}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to fetch media insights:', error);
        
        // Handle case where insights might not be available yet
        if (error.error?.code === 100) {
          console.log('Insights not yet available for this media');
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
      console.log('Media insights fetched:', data);
      return data;
    } catch (error: any) {
      console.error('Error fetching Instagram insights:', error);
      throw new Error(`Failed to fetch insights: ${error.message}`);
    }
  }

  async getUserInsights(period: 'day' | 'week' | 'days_28' = 'day', metrics?: string[]) {
    try {
      // User-level metrics - only use metrics that are valid for user insights
      const defaultMetrics = [
        'reach',
        'follower_count',
        'profile_views',
        'website_clicks'
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
        throw new Error(`Failed to fetch user insights: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      console.log('User insights fetched:', data);
      return data;
    } catch (error: any) {
      console.error('Error fetching Instagram user insights:', error);
      throw new Error(`Failed to fetch user insights: ${error.message}`);
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
}