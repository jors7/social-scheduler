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
    mediaUrls?: string[]; // For carousel posts
    caption: string;
    isVideo?: boolean;
    onProgress?: (status: string, progress?: number) => void;
  }) {
    // Check if this is a carousel post (multiple media items)
    if (content.mediaUrls && content.mediaUrls.length > 1) {
      return this.createCarouselPost(content);
    }

    // Single media post
    const mediaUrl = content.mediaUrl || content.imageUrl || (content.mediaUrls?.[0]);
    
    if (!mediaUrl) {
      throw new Error('Instagram posts require at least one media URL');
    }

    // Detect if it's a video based on file extension or explicit flag
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    const isVideo = content.isVideo || videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));
    
    console.log('InstagramService: Creating single post with:', {
      mediaUrl: mediaUrl.substring(0, 50) + '...',
      isVideo: isVideo
    });

    return this.client.createPost(mediaUrl, content.caption, isVideo, content.onProgress);
  }

  private async createCarouselPost(content: {
    mediaUrls?: string[];
    caption: string;
    onProgress?: (status: string, progress?: number) => void;
  }) {
    if (!content.mediaUrls || content.mediaUrls.length < 2) {
      throw new Error('Instagram carousel requires at least 2 media items');
    }

    if (content.mediaUrls.length > 10) {
      throw new Error('Instagram carousel supports maximum 10 media items');
    }

    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    
    // Prepare media items with type detection
    const mediaItems = content.mediaUrls.map(url => ({
      url,
      isVideo: videoExtensions.some(ext => url.toLowerCase().includes(ext))
    }));

    console.log('InstagramService: Creating carousel with:', {
      itemCount: mediaItems.length,
      videoCount: mediaItems.filter(item => item.isVideo).length,
      imageCount: mediaItems.filter(item => !item.isVideo).length
    });

    return this.client.createCarouselPost(mediaItems, content.caption, content.onProgress);
  }

  async getProfile() {
    return this.client.getProfile();
  }

  async getRecentMedia(limit = 10) {
    return this.client.getMedia(limit);
  }
}