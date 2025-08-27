import { createClient } from '@supabase/supabase-js';

interface LinkedInProfile {
  id: string;
  firstName?: {
    localized?: Record<string, string>;
  };
  lastName?: {
    localized?: Record<string, string>;
  };
}

interface LinkedInShareContent {
  text: string;
  media?: {
    url: string;
    type: 'image' | 'video';
  }[];
}

interface LinkedInShareResponse {
  id: string;
  activity?: string;
  lifecycleState?: string;
  visibility?: string;
}

export class LinkedInService {
  private accessToken: string;
  private userId?: string;
  private supabase?: ReturnType<typeof createClient>;

  constructor(accessToken: string, userId?: string) {
    this.accessToken = accessToken;
    this.userId = userId;

    // Initialize Supabase client if userId is provided
    if (userId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
  }

  /**
   * Share content on LinkedIn
   * https://docs.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
   */
  async shareContent(content: LinkedInShareContent): Promise<LinkedInShareResponse> {
    try {
      // Get the authenticated user's profile ID
      const profile = await this.getProfile();
      if (!profile.id) {
        throw new Error('Could not get LinkedIn profile ID');
      }

      console.log('LinkedIn posting with profile ID:', profile.id);

      // Prepare the share request body
      const shareBody: any = {
        author: `urn:li:person:${profile.id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.text
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      // Add media if provided
      if (content.media && content.media.length > 0) {
        const media = content.media[0]; // LinkedIn only supports one media item per post
        
        if (media.type === 'image') {
          shareBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
          shareBody.specificContent['com.linkedin.ugc.ShareContent'].media = [{
            status: 'READY',
            description: {
              text: content.text
            },
            media: media.url,
            title: {
              text: 'Image'
            }
          }];
        } else if (media.type === 'video') {
          // Video uploads require a more complex multi-step process
          // For now, we'll skip video support
          throw new Error('Video uploads are not yet supported');
        }
      }

      // Make the API request to share content
      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(shareBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('LinkedIn share failed:', errorData);
        throw new Error(`Failed to share on LinkedIn: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        id: result.id,
        activity: result.activity,
        lifecycleState: result.lifecycleState,
        visibility: result.visibility
      };
    } catch (error) {
      console.error('LinkedIn share error:', error);
      throw error;
    }
  }

  /**
   * Upload an image to LinkedIn
   * This is a multi-step process:
   * 1. Register the upload
   * 2. Upload the image binary
   * 3. Get the media asset URN
   */
  async uploadImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      // Get the authenticated user's profile ID
      const profile = await this.getProfile();
      if (!profile.id) {
        throw new Error('Could not get LinkedIn profile ID');
      }

      // Step 1: Register the upload
      const registerBody = {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${profile.id}`,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent'
          }]
        }
      };

      const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(registerBody)
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.text();
        console.error('LinkedIn image register failed:', errorData);
        throw new Error('Failed to register image upload');
      }

      const registerData = await registerResponse.json();
      const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerData.value.asset;

      // Step 2: Upload the image binary
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': mimeType
        },
        body: imageBuffer
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to LinkedIn');
      }

      // Return the asset URN which can be used in posts
      return asset;
    } catch (error) {
      console.error('LinkedIn image upload error:', error);
      throw error;
    }
  }

  /**
   * Get the authenticated user's profile using OpenID Connect
   */
  async getProfile(): Promise<any> {
    try {
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LinkedIn profile fetch failed:', response.status, errorText);
        throw new Error('Failed to fetch LinkedIn profile');
      }

      const data = await response.json();
      // Map OpenID Connect response to expected format
      return {
        id: data.sub,
        firstName: data.given_name,
        lastName: data.family_name,
        name: data.name,
        email: data.email
      };
    } catch (error) {
      console.error('LinkedIn profile fetch error:', error);
      throw error;
    }
  }

  /**
   * Check if the access token is still valid
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Format text content for LinkedIn
   * LinkedIn has a 3000 character limit for posts
   */
  static formatContent(content: string): string {
    // Remove HTML tags if present
    let formatted = content.replace(/<[^>]*>/g, '');
    
    // Convert HTML entities
    formatted = formatted
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    // Trim to 3000 characters if needed
    if (formatted.length > 3000) {
      formatted = formatted.substring(0, 2997) + '...';
    }
    
    return formatted;
  }

  /**
   * Post with image support
   */
  async postWithImage(text: string, imageBuffer: Buffer, mimeType: string): Promise<LinkedInShareResponse> {
    try {
      // First upload the image
      const imageAssetUrn = await this.uploadImage(imageBuffer, mimeType);

      // Get the authenticated user's profile ID
      const profile = await this.getProfile();
      if (!profile.id) {
        throw new Error('Could not get LinkedIn profile ID');
      }

      console.log('LinkedIn posting with image, profile ID:', profile.id);

      // Prepare the share request body with image
      const shareBody = {
        author: `urn:li:person:${profile.id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: LinkedInService.formatContent(text)
            },
            shareMediaCategory: 'IMAGE',
            media: [{
              status: 'READY',
              description: {
                text: 'Image shared from SocialCal'
              },
              media: imageAssetUrn,
              title: {
                text: 'Image'
              }
            }]
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      // Make the API request to share content
      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(shareBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('LinkedIn share with image failed:', errorData);
        throw new Error(`Failed to share on LinkedIn: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        id: result.id,
        activity: result.activity,
        lifecycleState: result.lifecycleState,
        visibility: result.visibility
      };
    } catch (error) {
      console.error('LinkedIn post with image error:', error);
      throw error;
    }
  }
}