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
        const maxAttempts = 30; // 30 attempts with 2 second delays = ~60 seconds max
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
                if (elapsedSeconds < 10) {
                  onProgress(`Processing video... (${elapsedSeconds}s)`, estimatedProgress);
                } else if (elapsedSeconds < 30) {
                  onProgress(`Processing video... Please wait (${elapsedSeconds}s)`, estimatedProgress);
                } else {
                  onProgress(`Processing larger video... Almost done (${elapsedSeconds}s)`, estimatedProgress);
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
          console.warn('Video processing timeout, attempting to publish anyway...');
          if (onProgress) {
            onProgress('Processing taking longer than expected, attempting to publish...');
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
      // Use Instagram Graph API endpoint
      const response = await fetch(
        `https://graph.instagram.com/${this.userID}/media?fields=id,media_type,media_url,permalink,caption,timestamp&limit=${limit}&access_token=${this.accessToken}`
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
}