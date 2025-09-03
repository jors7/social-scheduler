import { InstagramClient, InstagramCredentials } from './client';

export class InstagramService {
  private client: InstagramClient;

  constructor(credentials: InstagramCredentials) {
    // Add Instagram app secret from environment
    const credentialsWithSecret: InstagramCredentials = {
      ...credentials,
      appSecret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET
    };
    
    console.log('InstagramService: Initializing with app secret:', 
      credentialsWithSecret.appSecret ? 'YES' : 'NO');
    
    this.client = new InstagramClient(credentialsWithSecret);
  }

  async verifyCredentials() {
    return this.client.verifyCredentials();
  }

  async createPost(content: {
    imageUrl?: string;
    caption: string;
  }) {
    if (!content.imageUrl) {
      throw new Error('Instagram posts require an image URL');
    }

    return this.client.createPost(content.imageUrl, content.caption);
  }

  async getProfile() {
    return this.client.getProfile();
  }

  async getRecentMedia(limit = 10) {
    return this.client.getMedia(limit);
  }
}