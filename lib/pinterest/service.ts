import { PinterestClient } from './client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export class PinterestService {
  private client: PinterestClient;

  constructor(accessToken: string) {
    this.client = new PinterestClient(accessToken, false); // Use production API for real data
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

  async createPin(boardId: string, title: string, description: string, imageUrl?: string, link?: string) {
    try {
      // Note: This requires pins:write permission
      const pinData: any = {
        title: title,
        description: description,
      };

      if (imageUrl) {
        pinData.media_source = {
          source_type: 'image_url',
          url: imageUrl,
        };
      }

      if (link) {
        pinData.link = link;
      }

      const result = await this.client.createPin(boardId, pinData);
      return result;
    } catch (error) {
      console.error('Pinterest create pin error:', error);
      throw error;
    }
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