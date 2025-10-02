import { BskyAgent } from '@atproto/api';

export interface BlueskyCredentials {
  identifier: string; // handle or DID
  password: string;   // app password
}

export class BlueskyClient {
  private agent: BskyAgent;

  constructor() {
    this.agent = new BskyAgent({
      service: 'https://bsky.social',
    });
  }

  async login(credentials: BlueskyCredentials) {
    try {
      const response = await this.agent.login({
        identifier: credentials.identifier,
        password: credentials.password,
      });

      return {
        success: true,
        session: response.data,
      };
    } catch (error: any) {
      console.error('Bluesky login error:', error);
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async getProfile(actor?: string) {
    try {
      const response = await this.agent.getProfile({ 
        actor: actor || this.agent.session?.did || '' 
      });
      return response.data;
    } catch (error: any) {
      console.error('Error getting Bluesky profile:', error);
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  async createPost(text: string, images?: Buffer[]) {
    try {
      let embed: any = undefined;
      
      if (images && images.length > 0) {
        const uploadedImages = [];
        for (const image of images) {
          const uploadResponse = await this.agent.uploadBlob(image, {
            encoding: 'image/jpeg',
          });
          uploadedImages.push({
            alt: '',
            image: uploadResponse.data.blob,
          });
        }
        
        embed = {
          $type: 'app.bsky.embed.images',
          images: uploadedImages,
        };
      }

      const response = await this.agent.post({
        text,
        embed,
        createdAt: new Date().toISOString(),
      } as any);

      return {
        success: true,
        post: response,
      };
    } catch (error: any) {
      console.error('Error creating Bluesky post:', error);
      throw new Error(`Failed to create post: ${error.message}`);
    }
  }

  async verifyCredentials(credentials: BlueskyCredentials) {
    const tempAgent = new BskyAgent({
      service: 'https://bsky.social',
    });

    try {
      const loginResponse = await tempAgent.login({
        identifier: credentials.identifier,
        password: credentials.password,
      });

      const profile = await tempAgent.getProfile({ 
        actor: loginResponse.data.did 
      });

      return {
        did: loginResponse.data.did,
        handle: loginResponse.data.handle,
        email: loginResponse.data.email,
        displayName: profile.data.displayName || profile.data.handle,
        avatar: profile.data.avatar,
        description: profile.data.description,
        followersCount: profile.data.followersCount,
        followsCount: profile.data.followsCount,
        postsCount: profile.data.postsCount,
      };
    } catch (error: any) {
      console.error('Error verifying Bluesky credentials:', error);

      // Provide more specific error messages
      if (error.error === 'RateLimitExceeded' || error.message?.includes('Rate Limit')) {
        throw new Error('Rate limit exceeded. Please wait a few minutes and try again.');
      }

      if (error.error === 'AuthenticationRequired' || error.message?.includes('Invalid identifier or password')) {
        throw new Error('Invalid username or app password. Please check your credentials.');
      }

      throw new Error(`Verification failed: ${error.message || 'Unknown error'}`);
    }
  }
}