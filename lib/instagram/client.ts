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

  async createPost(mediaUrl: string, caption: string, isVideo: boolean = false) {
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

      // Step 2: Publish the media
      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: this.accessToken,
      });

      // Do NOT add appsecret_proof for graph.instagram.com calls

      console.log('Publishing media container...');
      
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