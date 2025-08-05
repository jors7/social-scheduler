import { FacebookClient } from './client';

export class FacebookService {
  private client: FacebookClient;

  constructor() {
    this.client = new FacebookClient();
  }

  async authenticateUser(code: string, redirectUri: string) {
    try {
      // Exchange code for access token
      const tokenData = await this.client.exchangeCodeForToken(code, redirectUri);
      
      // Get user's Facebook pages
      const pagesData = await this.client.getUserPages(tokenData.access_token);
      
      if (!pagesData.data || pagesData.data.length === 0) {
        throw new Error('No Facebook pages found');
      }

      // Return the first page (you might want to let user choose)
      const page = pagesData.data[0];
      
      // Get detailed page info
      const pageInfo = await this.client.getPageInfo(page.id, page.access_token);
      
      return {
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        pageInfo: pageInfo,
        userAccessToken: tokenData.access_token,
      };
    } catch (error) {
      console.error('Facebook authentication error:', error);
      throw error;
    }
  }

  async postContent(pageId: string, pageAccessToken: string, content: string) {
    try {
      const result = await this.client.postToPage(pageId, pageAccessToken, content);
      return result;
    } catch (error) {
      console.error('Facebook post error:', error);
      throw error;
    }
  }
}