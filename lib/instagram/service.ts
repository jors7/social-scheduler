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
    isStory?: boolean; // New parameter for story posts
    isReel?: boolean; // New parameter for reel posts
    onProgress?: (status: string, progress?: number) => void;
  }) {
    // Check if this is a story post
    if (content.isStory) {
      return this.createStory(content);
    }

    // Check if this is a reel post
    if (content.isReel) {
      return this.createReel(content);
    }
    
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
    console.log('[Instagram Service] mediaUrl type check:', {
      mediaUrl,
      type: typeof mediaUrl,
      isString: typeof mediaUrl === 'string'
    });
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    const isVideo = content.isVideo || (typeof mediaUrl === 'string' && videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext)));
    
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

    console.log('[Instagram Service] Carousel mediaUrls check:', {
      mediaUrls: content.mediaUrls,
      types: content.mediaUrls.map(url => ({ url, type: typeof url }))
    });

    // Prepare media items with type detection
    const mediaItems = content.mediaUrls.map(url => ({
      url,
      isVideo: typeof url === 'string' && videoExtensions.some(ext => url.toLowerCase().includes(ext))
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

  private async createStory(content: {
    imageUrl?: string;
    mediaUrl?: string;
    mediaUrls?: string[];
    caption: string;
    isVideo?: boolean;
    onProgress?: (status: string, progress?: number) => void;
  }) {
    const mediaUrl = content.mediaUrl || content.imageUrl || (content.mediaUrls?.[0]);

    if (!mediaUrl) {
      throw new Error('Instagram stories require a media URL');
    }

    // Note: Stories don't support carousels
    if (content.mediaUrls && content.mediaUrls.length > 1) {
      console.warn('Instagram stories do not support multiple media items. Using first item only.');
    }

    // Detect if it's a video
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    const isVideo = content.isVideo || (typeof mediaUrl === 'string' && videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext)));

    console.log('InstagramService: Creating story with:', {
      mediaUrl: mediaUrl.substring(0, 50) + '...',
      isVideo: isVideo
    });

    return this.client.createStory(mediaUrl, isVideo, content.onProgress);
  }

  private async createReel(content: {
    imageUrl?: string;
    mediaUrl?: string;
    mediaUrls?: string[];
    caption: string;
    isVideo?: boolean;
    onProgress?: (status: string, progress?: number) => void;
  }) {
    const mediaUrl = content.mediaUrl || content.imageUrl || (content.mediaUrls?.[0]);

    if (!mediaUrl) {
      throw new Error('Instagram reels require a video URL');
    }

    // Note: Reels don't support carousels
    if (content.mediaUrls && content.mediaUrls.length > 1) {
      console.warn('Instagram reels do not support multiple media items. Using first item only.');
    }

    // Reels must be videos
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    const isVideo = content.isVideo || (typeof mediaUrl === 'string' && videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext)));

    if (!isVideo) {
      throw new Error('Instagram reels require a video file');
    }

    console.log('InstagramService: Creating reel with:', {
      mediaUrl: mediaUrl.substring(0, 50) + '...',
      caption: content.caption
    });

    return this.client.createReel(mediaUrl, content.caption, content.onProgress);
  }

  async getMediaInsights(mediaId: string, metrics?: string[]) {
    return this.client.getMediaInsights(mediaId, metrics);
  }

  async getUserInsights(period: 'day' | 'week' | 'days_28' = 'day', metrics?: string[]) {
    return this.client.getUserInsights(period, metrics);
  }

  async getStoryInsights(storyId: string) {
    return this.client.getStoryInsights(storyId);
  }
}