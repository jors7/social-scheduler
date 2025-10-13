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
   * Register a media upload with Pinterest
   * Step 1 of video upload process
   */
  async registerMediaUpload(): Promise<{
    media_id: string;
    media_type: string;
    upload_url: string;
    upload_parameters: Record<string, string>;
  }> {
    console.log('=== Registering Media Upload ===');

    const response = await fetch(
      `${this.apiBaseUrl}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_type: 'video'
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Media registration failed:', errorText);
      throw new Error(`Failed to register media upload: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Media registered:', { media_id: result.media_id, media_type: result.media_type });
    return result;
  }

  /**
   * Check media upload status
   * Step 3 of video upload process - poll until succeeded
   */
  async getMediaStatus(mediaId: string): Promise<{
    media_id: string;
    media_type: string;
    status: 'registered' | 'processing' | 'succeeded' | 'failed';
  }> {
    const response = await fetch(
      `${this.apiBaseUrl}/media/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get media status: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Poll media status until it's succeeded or failed
   * @param mediaId - The media ID to poll
   * @param maxAttempts - Maximum number of polling attempts (default 60 = 5 minutes)
   * @param intervalMs - Time between polls in milliseconds (default 5000 = 5 seconds)
   */
  async waitForMediaProcessing(
    mediaId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<void> {
    console.log(`Waiting for media ${mediaId} to process...`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getMediaStatus(mediaId);
      console.log(`Media status (attempt ${attempt + 1}/${maxAttempts}):`, status.status);

      if (status.status === 'succeeded') {
        console.log('✅ Media processing succeeded');
        return;
      }

      if (status.status === 'failed') {
        throw new Error('Media processing failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Media processing timeout after ${maxAttempts} attempts`);
  }

  /**
   * Upload video file to Pinterest's S3 bucket
   * Step 2 of video upload process
   */
  async uploadVideoFile(
    uploadUrl: string,
    uploadParameters: Record<string, string>,
    videoUrl: string
  ): Promise<void> {
    console.log('=== Uploading Video File ===');
    console.log('Fetching video from:', videoUrl.substring(0, 80) + '...');

    // Fetch the video file
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    }

    const videoBlob = await videoResponse.blob();
    console.log('Video size:', (videoBlob.size / 1024 / 1024).toFixed(2), 'MB');

    // Create multipart form data
    const formData = new FormData();

    // Add all upload parameters first (order matters for AWS S3)
    Object.entries(uploadParameters).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Add the file last
    formData.append('file', videoBlob, 'video.mp4');

    console.log('Uploading to S3...');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', errorText);
      throw new Error(`Video upload failed: ${uploadResponse.status}`);
    }

    console.log('✅ Video uploaded successfully');
  }

  /**
   * Create a video pin using the complete upload flow
   *
   * This implements the full Pinterest video pin workflow:
   * 1. Register media upload → get media_id and upload_url
   * 2. Upload video file to S3
   * 3. Poll status until processing succeeds
   * 4. Create pin with media_id
   *
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
    console.log('=== Creating Video Pin (Full Upload Flow) ===');
    console.log('Video URL:', videoUrl);
    console.log('Cover Image:', coverImageUrl || 'Auto-generated');

    try {
      // Step 1: Register media upload
      const mediaRegistration = await this.registerMediaUpload();
      const { media_id, upload_url, upload_parameters } = mediaRegistration;

      // Step 2: Upload video file to S3
      await this.uploadVideoFile(upload_url, upload_parameters, videoUrl);

      // Step 3: Wait for processing to complete
      await this.waitForMediaProcessing(media_id);

      // Step 4: Create the pin with media_id
      const pinData: any = {
        title,
        description,
        media_source: {
          source_type: 'video_id',
          media_id: media_id,
        }
      };

      // Add cover image if provided
      if (coverImageUrl) {
        pinData.media_source.cover_image_url = coverImageUrl;
      }

      if (link) {
        pinData.link = link;
      }

      console.log('Creating pin with media_id:', media_id);
      return await this.createPin(boardId, pinData);

    } catch (error) {
      console.error('Video pin creation failed:', error);
      throw error;
    }
  }
}