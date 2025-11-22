import { PinterestClient } from './client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export class PinterestService {
  private client: PinterestClient;

  constructor(accessToken: string) {
    this.client = new PinterestClient(accessToken, false); // Use production API (standard access approved)
  }

  async getUserProfile() {
    try {
      const userInfo = await this.client.getUserInfo();
      return {
        id: userInfo.username,
        username: userInfo.username,
        name: userInfo.business_name || userInfo.username,
        profileImageUrl: null, // Pinterest v5 API doesn't include profile images in user_account endpoint
        accountType: userInfo.account_type,
      };
    } catch (error) {
      console.error('Pinterest user profile error:', error);
      throw error;
    }
  }

  async getBoards() {
    try {
      const boardsData = await this.client.getUserBoards();
      return boardsData.items || [];
    } catch (error) {
      console.error('Pinterest boards error:', error);
      throw error;
    }
  }

  async getPins() {
    try {
      const pinsData = await this.client.getUserPins();
      return pinsData.items || [];
    } catch (error) {
      console.error('Pinterest pins error:', error);
      throw error;
    }
  }

  async createPin(boardId: string, title: string, description: string, imageUrl?: string, link?: string, altText?: string) {
    try {
      // Note: This requires pins:write permission
      // Pinterest v5 API requires specific structure
      const pinData: any = {
        title: title || undefined, // Only include if provided
        description: description || undefined, // Only include if provided
      };

      if (imageUrl) {
        // Pinterest requires media_source with specific structure
        pinData.media_source = {
          source_type: 'image_url',
          url: imageUrl
        };
      }

      if (link) {
        pinData.link = link;
      }

      if (altText) {
        pinData.alt_text = altText;
      }

      // Remove undefined values
      Object.keys(pinData).forEach(key =>
        pinData[key] === undefined && delete pinData[key]
      );

      const result = await this.client.createPin(boardId, pinData);
      return result;
    } catch (error) {
      console.error('Pinterest create pin error:', error);
      throw error;
    }
  }

  /**
   * Create a carousel pin with multiple images (2-5 images)
   */
  async createCarouselPin(
    boardId: string,
    title: string,
    description: string,
    imageUrls: string[],
    link?: string
  ) {
    try {
      return await this.client.createCarouselPin(boardId, title, description, imageUrls, link);
    } catch (error) {
      console.error('Pinterest create carousel pin error:', error);
      throw error;
    }
  }

  /**
   * Create a video pin
   */
  async createVideoPin(
    boardId: string,
    title: string,
    description: string,
    videoUrl: string,
    coverImageUrl?: string,
    link?: string
  ) {
    try {
      return await this.client.createVideoPin(boardId, title, description, videoUrl, coverImageUrl, link);
    } catch (error) {
      console.error('Pinterest create video pin error:', error);
      throw error;
    }
  }

  /**
   * Smart pin creation - detects media type and creates appropriate pin
   */
  async createSmartPin(
    boardId: string,
    title: string,
    description: string,
    mediaUrls: string[],
    link?: string,
    altText?: string
  ) {
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('At least one media URL is required');
    }

    // Detect media types for all URLs
    const videoExtensions = /\.(mp4|mov|m4v|webm)$/;
    const mediaTypes = mediaUrls.map(url => ({
      url,
      isVideo: videoExtensions.test(url.toLowerCase())
    }));

    const videoCount = mediaTypes.filter(m => m.isVideo).length;
    const imageCount = mediaTypes.filter(m => !m.isVideo).length;

    // Validate: Pinterest doesn't support video carousels
    if (videoCount > 1) {
      throw new Error('Pinterest does not support video carousels. Please select only one video, or use images for a carousel (2-5 images).');
    }

    // Validate: Pinterest doesn't support mixed media (this should be caught earlier, but double-check)
    if (videoCount > 0 && imageCount > 0) {
      throw new Error('Pinterest does not support mixing videos and images. Please select either one video OR multiple images (2-5).');
    }

    // Create video pin (single video only)
    if (videoCount === 1) {
      return await this.createVideoPin(
        boardId,
        title,
        description,
        mediaUrls[0],
        undefined, // Let Pinterest auto-generate cover from video
        link
      );
    }

    // Create carousel pin (2-5 images)
    if (imageCount >= 2 && imageCount <= 5) {
      return await this.createCarouselPin(boardId, title, description, mediaUrls, link);
    }

    // Create standard image pin (single image)
    if (imageCount === 1) {
      return await this.createPin(boardId, title, description, mediaUrls[0], link, altText);
    }

    throw new Error('Invalid media selection for Pinterest');
  }
}

/**
 * Helper function to get Pinterest service for a user
 */
export async function getUserPinterestService(userId: string) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // Get Pinterest account
  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'pinterest')
    .eq('is_active', true)
    .single();

  if (error || !account) {
    throw new Error('Pinterest account not connected');
  }

  return new PinterestService(account.access_token);
}

/**
 * Format content for Pinterest
 */
export function formatPinterestContent(content: string, title?: string): { title: string; description: string } {
  // Pinterest has a 500 character limit for descriptions
  const maxDescriptionLength = 500;
  
  // Clean HTML and format content
  const cleanContent = content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // Generate title if not provided
  const pinTitle = title || cleanContent.split('\n')[0].substring(0, 100) || 'New Pin';
  
  // Truncate description if needed
  let description = cleanContent;
  if (description.length > maxDescriptionLength) {
    description = description.substring(0, maxDescriptionLength - 3) + '...';
  }

  return {
    title: pinTitle,
    description,
  };
}