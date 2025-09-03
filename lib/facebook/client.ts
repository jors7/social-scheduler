export class FacebookClient {
  private appId: string;
  private appSecret: string;

  constructor() {
    // Use dedicated Facebook app credentials, fallback to META for backward compatibility
    this.appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || '';
    this.appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || '';
    
    if (!this.appId || !this.appSecret) {
      throw new Error('Facebook API credentials not configured');
    }
  }

  async exchangeCodeForToken(code: string, redirectUri: string) {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code: code,
    });

    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  async getPageInfo(pageId: string, accessToken: string) {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=id,name,category,picture,fan_count,about&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to get page info');
    }

    return response.json();
  }

  async getUserPages(accessToken: string) {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to get user pages');
    }

    return response.json();
  }

  async postToPage(pageId: string, pageAccessToken: string, message: string, mediaUrls?: string[]) {
    // If we have media, we need to post differently
    if (mediaUrls && mediaUrls.length > 0) {
      // For a single image
      if (mediaUrls.length === 1) {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/photos`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: message,
              url: mediaUrls[0],
              access_token: pageAccessToken,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error('Facebook photo post error:', error);
          throw new Error('Failed to post photo to Facebook page');
        }

        return response.json();
      } else {
        // For multiple images, we need to upload them first then create a post
        // This is more complex and requires multiple API calls
        // For now, just post with the first image
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/photos`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: message,
              url: mediaUrls[0],
              access_token: pageAccessToken,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to post photos to Facebook page');
        }

        return response.json();
      }
    } else {
      // Text-only post
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/feed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            access_token: pageAccessToken,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to post to Facebook page');
      }

      return response.json();
    }
  }
}