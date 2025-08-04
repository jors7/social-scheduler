import { BskyApi } from '@atproto/api';

export interface BlueskyCredentials {
  identifier: string; // handle or DID
  password: string;   // app password
}

export class BlueskyClient {
  private api: BskyApi;

  constructor() {
    this.api = new BskyApi({
      service: 'https://bsky.social',
    });
  }

  async login(credentials: BlueskyCredentials) {
    try {
      const response = await this.api.login({
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
      const response = await this.api.getProfile({ 
        actor: actor || this.api.session?.did || '' 
      });
      return response.data;
    } catch (error: any) {
      console.error('Error getting Bluesky profile:', error);
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  async createPost(text: string, images?: Buffer[]) {
    try {
      let embed;
      
      if (images && images.length > 0) {
        const uploadedImages = [];
        for (const image of images) {
          const uploadResponse = await this.api.uploadBlob(image, {
            encoding: 'image/jpeg', // You might want to detect the actual type
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

      const response = await this.api.post({
        text,
        embed,
        createdAt: new Date().toISOString(),
      });

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
    const tempApi = new BskyApi({
      service: 'https://bsky.social',
    });

    try {
      const loginResponse = await tempApi.login({
        identifier: credentials.identifier,
        password: credentials.password,
      });

      const profile = await tempApi.getProfile({ 
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
      throw new Error(`Verification failed: ${error.message}`);
    }
  }
}