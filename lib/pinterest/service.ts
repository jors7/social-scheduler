import { PinterestClient } from './client';

export class PinterestService {
  private client: PinterestClient;

  constructor(accessToken: string) {
    this.client = new PinterestClient(accessToken);
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

  async createPin(boardId: string, title: string, description: string, imageUrl: string) {
    try {
      // Note: This requires pins:write permission
      const pinData = {
        title: title,
        description: description,
        media_source: {
          source_type: 'image_url',
          url: imageUrl,
        },
      };

      const result = await this.client.createPin(boardId, pinData);
      return result;
    } catch (error) {
      console.error('Pinterest create pin error:', error);
      throw error;
    }
  }
}