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
    mediaUrl?: string;
    caption: string;
    isVideo?: boolean;
  }) {
    const mediaUrl = content.mediaUrl || content.imageUrl;
    
    if (!mediaUrl) {
      throw new Error('Instagram posts require a media URL');
    }

    // Detect if it's a video based on file extension or explicit flag
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    const isVideo = content.isVideo || videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));
    
    console.log('InstagramService: Creating post with:', {
      mediaUrl: mediaUrl.substring(0, 50) + '...',
      isVideo: isVideo
    });

    return this.client.createPost(mediaUrl, content.caption, isVideo);
  }

  async getProfile() {
    return this.client.getProfile();
  }

  async getRecentMedia(limit = 10) {
    return this.client.getMedia(limit);
  }
}