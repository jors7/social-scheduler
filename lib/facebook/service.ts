export class FacebookService {
  private baseUrl = 'https://graph.facebook.com/v18.0';

  /**
   * Create a text post on a Facebook page
   */
  async createPost(
    pageId: string,
    pageAccessToken: string,
    message: string
  ): Promise<{ id: string }> {
    try {
      console.log('Creating Facebook text post...');
      
      const url = `${this.baseUrl}/${pageId}/feed`;
      const params = new URLSearchParams({
        message: message,
        access_token: pageAccessToken
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Facebook post error:', data);
        throw new Error(data.error?.message || 'Failed to create Facebook post');
      }

      console.log('Facebook post created:', data.id);
      return { id: data.id };
    } catch (error) {
      console.error('Facebook posting error:', error);
      throw error;
    }
  }

  /**
   * Create a photo post on a Facebook page
   */
  async createPhotoPost(
    pageId: string,
    pageAccessToken: string,
    message: string,
    imageUrl: string
  ): Promise<{ id: string }> {
    try {
      console.log('Creating Facebook photo post...');
      
      const url = `${this.baseUrl}/${pageId}/photos`;
      const params = new URLSearchParams({
        message: message,
        url: imageUrl, // Facebook will fetch the image from this URL
        access_token: pageAccessToken
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Facebook photo post error:', data);
        throw new Error(data.error?.message || 'Failed to create Facebook photo post');
      }

      console.log('Facebook photo post created:', data.id);
      return { id: data.id };
    } catch (error) {
      console.error('Facebook photo posting error:', error);
      throw error;
    }
  }

  /**
   * Create a video post on a Facebook page
   */
  async createVideoPost(
    pageId: string,
    pageAccessToken: string,
    message: string,
    videoUrl: string
  ): Promise<{ id: string }> {
    try {
      console.log('Creating Facebook video post...');
      
      // For videos, we need to use the video upload endpoint
      const url = `${this.baseUrl}/${pageId}/videos`;
      const params = new URLSearchParams({
        description: message,
        file_url: videoUrl, // Facebook will fetch the video from this URL
        access_token: pageAccessToken
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Facebook video post error:', data);
        throw new Error(data.error?.message || 'Failed to create Facebook video post');
      }

      console.log('Facebook video post created:', data.id);
      return { id: data.id };
    } catch (error) {
      console.error('Facebook video posting error:', error);
      throw error;
    }
  }

  /**
   * Create a post with multiple photos (carousel)
   */
  async createCarouselPost(
    pageId: string,
    pageAccessToken: string,
    message: string,
    imageUrls: string[]
  ): Promise<{ id: string }> {
    try {
      console.log('Creating Facebook carousel post with', imageUrls.length, 'images...');
      
      // First, upload each photo without publishing
      const photoIds = [];
      for (const imageUrl of imageUrls) {
        const uploadUrl = `${this.baseUrl}/${pageId}/photos`;
        const uploadParams = new URLSearchParams({
          url: imageUrl,
          published: 'false', // Don't publish yet
          access_token: pageAccessToken
        });

        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: uploadParams.toString()
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          console.error('Failed to upload photo:', uploadData);
          throw new Error(uploadData.error?.message || 'Failed to upload photo');
        }

        photoIds.push(uploadData.id);
        console.log('Uploaded photo:', uploadData.id);
      }

      // Now create a post with all the photos
      const postUrl = `${this.baseUrl}/${pageId}/feed`;
      const postParams = new URLSearchParams({
        message: message,
        access_token: pageAccessToken
      });

      // Add each photo ID to the request
      photoIds.forEach((photoId, index) => {
        postParams.append(`attached_media[${index}]`, JSON.stringify({ media_fbid: photoId }));
      });

      const postResponse = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: postParams.toString()
      });

      const postData = await postResponse.json();

      if (!postResponse.ok) {
        console.error('Failed to create carousel post:', postData);
        throw new Error(postData.error?.message || 'Failed to create carousel post');
      }

      console.log('Facebook carousel post created:', postData.id);
      return { id: postData.id };
    } catch (error) {
      console.error('Facebook carousel posting error:', error);
      throw error;
    }
  }

  /**
   * Get page insights (analytics)
   */
  async getPageInsights(
    pageId: string,
    pageAccessToken: string,
    metrics: string[] = ['page_impressions', 'page_engaged_users', 'page_views_total']
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/${pageId}/insights`;
      const params = new URLSearchParams({
        metric: metrics.join(','),
        period: 'day',
        access_token: pageAccessToken
      });

      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to get page insights:', data);
        throw new Error(data.error?.message || 'Failed to get page insights');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting page insights:', error);
      throw error;
    }
  }

  /**
   * Get post insights (analytics for a specific post)
   */
  async getPostInsights(
    postId: string,
    pageAccessToken: string
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/${postId}/insights`;
      const params = new URLSearchParams({
        metric: 'post_impressions,post_engaged_users,post_clicks',
        access_token: pageAccessToken
      });

      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to get post insights:', data);
        throw new Error(data.error?.message || 'Failed to get post insights');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting post insights:', error);
      throw error;
    }
  }

  /**
   * Verify if a page access token is still valid
   */
  async verifyToken(pageAccessToken: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/debug_token`;
      const params = new URLSearchParams({
        input_token: pageAccessToken,
        access_token: `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`
      });

      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to verify token:', data);
        return false;
      }

      return data.data?.is_valid === true;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  }

  /**
   * Refresh a page access token if needed
   */
  async refreshPageToken(
    pageId: string,
    currentToken: string
  ): Promise<string | null> {
    try {
      // First verify if current token is still valid
      const isValid = await this.verifyToken(currentToken);
      if (isValid) {
        return currentToken; // Token is still valid
      }

      // If not valid, try to refresh using the app token
      // This requires the user to re-authenticate
      console.log('Token expired, user needs to re-authenticate');
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }
}