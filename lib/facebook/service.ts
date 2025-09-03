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
      
      // If no pages found, return user info for manual setup later
      if (!pagesData.data || pagesData.data.length === 0) {
        console.log('No Facebook pages found - will allow manual setup');
        
        // Get user info to at least store the connection
        const userResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${tokenData.access_token}`
        );
        const userData = await userResponse.json();
        
        // Return with flag indicating manual page setup is needed
        return {
          pageId: 'PENDING_SETUP',
          pageName: userData.name || 'Facebook User', 
          pageAccessToken: tokenData.access_token, // Store user token for later
          pageInfo: {
            id: userData.id,
            name: userData.name,
            requiresManualSetup: true
          },
          userAccessToken: tokenData.access_token,
          requiresManualSetup: true
        };
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