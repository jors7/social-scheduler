export class PinterestClient {
  private accessToken: string;
  private apiBaseUrl: string;

  constructor(accessToken: string, useSandbox: boolean = false) {
    this.accessToken = accessToken;
    // Now using production API by default since we have standard access
    this.apiBaseUrl = useSandbox 
      ? 'https://api-sandbox.pinterest.com/v5'
      : 'https://api.pinterest.com/v5';
  }

  async getUserInfo() {
    console.log('Making Pinterest API request to user_account endpoint...');
    console.log('Token length:', this.accessToken.length);
    
    const response = await fetch(
      `${this.apiBaseUrl}/user_account`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Pinterest API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinterest API error response:', errorText);
      throw new Error(`Failed to get Pinterest user info: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Pinterest user data:', data);
    return data;
  }

  async getUserBoards() {
    const response = await fetch(
      `${this.apiBaseUrl}/boards`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get Pinterest boards');
    }

    return response.json();
  }

  async getUserPins() {
    const response = await fetch(
      `${this.apiBaseUrl}/pins`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get Pinterest pins');
    }

    return response.json();
  }

  // This would need pins:write permission (not available in testing token)
  async createPin(boardId: string, pinData: any) {
    const requestBody = {
      board_id: boardId,
      ...pinData,
    };

    console.log('=== Pinterest Pin Creation Debug ===');
    console.log('API Endpoint:', `${this.apiBaseUrl}/pins`);
    console.log('Using Sandbox:', this.apiBaseUrl.includes('sandbox'));
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('Token (first 20 chars):', this.accessToken.substring(0, 20) + '...');

    const response = await fetch(
      `${this.apiBaseUrl}/pins`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== Pinterest API Error ===');
      console.error('Status:', response.status);
      console.error('Error Response:', errorText);

      // Try to parse error as JSON for better debugging and error handling
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
        console.error('Parsed Error:', JSON.stringify(errorJson, null, 2));

        // Handle aspect ratio error for carousel pins
        if (errorJson.message?.includes('same width/height ratio')) {
          throw new Error('Carousel pins require all images to have the same aspect ratio. Please ensure all images are the same dimensions (e.g., all square, all portrait, or all landscape with matching ratios).');
        }
      } catch (e) {
        // If it's already our custom error, rethrow it
        if (e instanceof Error && e.message.includes('Carousel pins require')) {
          throw e;
        }
        // Not JSON or different error, continue with generic error
      }

      throw new Error(`Pinterest API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('=== Pin Created Successfully ===');
    console.log('Result:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Create a carousel pin with multiple images (2-5 images)
   *
   * IMPORTANT: Pinterest requires all images in a carousel to have the SAME aspect ratio.
   * For example:
   * - All images must be square (1:1)
   * - OR all images must be portrait (2:3, 4:5, etc.)
   * - OR all images must be landscape (16:9, 3:2, etc.)
   *
   * @param boardId - The board ID to post to
   * @param title - Pin title
   * @param description - Pin description
   * @param imageUrls - Array of 2-5 image URLs (must have matching aspect ratios)
   * @param link - Optional destination link
   */
  async createCarouselPin(
    boardId: string,
    title: string,
    description: string,
    imageUrls: string[],
    link?: string
  ) {
    if (imageUrls.length < 2 || imageUrls.length > 5) {
      throw new Error('Carousel pins require 2-5 images');
    }

    const pinData: any = {
      title,
      description,
      media_source: {
        source_type: 'multiple_image_urls',
        items: imageUrls.map(url => ({
          url,
          title: title, // Can be customized per image if needed
        }))
      }
    };

    if (link) {
      pinData.link = link;
    }

    console.log('=== Creating Carousel Pin ===');
    console.log('Images:', imageUrls.length);
    console.log('⚠️  Note: All images must have the same aspect ratio');

    return this.createPin(boardId, pinData);
  }

  /**
   * Create a video pin
   * @param boardId - The board ID to post to
   * @param title - Pin title
   * @param description - Pin description
   * @param videoUrl - Video URL (must be publicly accessible)
   * @param coverImageUrl - Optional cover image URL
   * @param link - Optional destination link
   */
  async createVideoPin(
    boardId: string,
    title: string,
    description: string,
    videoUrl: string,
    coverImageUrl?: string,
    link?: string
  ) {
    const pinData: any = {
      title,
      description,
      media_source: {
        source_type: 'video_url',
        url: videoUrl,
        cover_image_url: coverImageUrl
      }
    };

    if (link) {
      pinData.link = link;
    }

    console.log('=== Creating Video Pin ===');
    console.log('Video URL:', videoUrl);
    console.log('Cover Image:', coverImageUrl || 'Auto-generated');

    return this.createPin(boardId, pinData);
  }
}