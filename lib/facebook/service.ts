export class FacebookService {
  private baseUrl = 'https://graph.facebook.com/v21.0';

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
   * Create a story post on a Facebook page (photo or video)
   */
  async createStoryPost(
    pageId: string,
    pageAccessToken: string,
    mediaUrl: string,
    mediaType: 'photo' | 'video'
  ): Promise<{ id: string }> {
    try {
      console.log(`Creating Facebook ${mediaType} story...`);

      // Step 1: Upload media without publishing
      const uploadEndpoint = mediaType === 'photo' ? 'photos' : 'videos';
      const uploadUrl = `${this.baseUrl}/${pageId}/${uploadEndpoint}`;
      const uploadParams = new URLSearchParams({
        url: mediaUrl,
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
        console.error(`Failed to upload ${mediaType} for story:`, uploadData);
        throw new Error(uploadData.error?.message || `Failed to upload ${mediaType} for story`);
      }

      const mediaId = uploadData.id;
      console.log(`${mediaType} uploaded for story:`, mediaId);

      // Step 2: Publish to correct Stories endpoint (photo_stories or video_stories)
      const storyEndpoint = mediaType === 'photo' ? 'photo_stories' : 'video_stories';
      const storyUrl = `${this.baseUrl}/${pageId}/${storyEndpoint}`;
      const storyParams = new URLSearchParams({
        [mediaType === 'photo' ? 'photo_id' : 'video_id']: mediaId,
        access_token: pageAccessToken
      });

      const storyResponse = await fetch(storyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: storyParams.toString()
      });

      const storyData = await storyResponse.json();

      if (!storyResponse.ok) {
        console.error('Failed to create story:', storyData);
        throw new Error(storyData.error?.message || 'Failed to create Facebook story');
      }

      console.log('Facebook story created:', storyData.id);

      // Fetch thumbnail URL for video stories
      let thumbnailUrl: string | null = null;
      if (mediaType === 'video') {
        console.log('Fetching Story thumbnail...');
        thumbnailUrl = await this.getVideoThumbnail(mediaId, pageAccessToken);
      }

      return {
        id: storyData.id,
        thumbnailUrl: thumbnailUrl
      } as { id: string; thumbnailUrl?: string | null };
    } catch (error) {
      console.error('Facebook story posting error:', error);
      throw error;
    }
  }

  /**
   * Create a Reel post on a Facebook page
   * Uses 3-phase resumable binary upload: start, upload bytes, finish
   */
  async createReelPost(
    pageId: string,
    pageAccessToken: string,
    message: string,
    videoUrl: string
  ): Promise<{ id: string; permalink?: string }> {
    try {
      console.log('Creating Facebook Reel with binary upload...');

      // Phase 1: Initialize upload session
      console.log('Phase 1: Initializing Reel upload session...');
      const reelsUrl = `${this.baseUrl}/${pageId}/video_reels`;
      const startParams = new URLSearchParams({
        upload_phase: 'start',
        access_token: pageAccessToken
      });

      const startResponse = await fetch(reelsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: startParams.toString()
      });

      const startData = await startResponse.json();

      if (!startResponse.ok) {
        console.error('Failed to initialize Reel upload:', startData);
        throw new Error(startData.error?.message || 'Failed to initialize Facebook Reel upload');
      }

      const { video_id: videoId, upload_url: uploadUrl } = startData;
      console.log('Reel upload initialized:', { videoId, uploadUrl });

      // Phase 2: Fetch video from Supabase and upload bytes to Facebook
      console.log('Phase 2: Fetching video from storage and uploading to Facebook...');

      // Fetch video from Supabase storage
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video from storage: ${videoResponse.statusText}`);
      }

      const videoBlob = await videoResponse.blob();
      const videoBuffer = await videoBlob.arrayBuffer();
      console.log(`Video fetched: ${videoBuffer.byteLength} bytes`);

      // Upload video bytes to Facebook's upload URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${pageAccessToken}`,
          'offset': '0',
          'file_size': videoBuffer.byteLength.toString()
        },
        body: videoBuffer
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.text();
        console.error('Failed to upload video bytes:', uploadError);
        throw new Error(`Failed to upload video to Facebook: ${uploadResponse.statusText}`);
      }

      console.log('Video bytes uploaded successfully');

      // Wait for upload processing to complete before publishing
      console.log('Waiting for video upload to be processed...');
      let uploadComplete = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max

      while (!uploadComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        attempts++;

        const checkUrl = `${this.baseUrl}/${videoId}`;
        const checkParams = new URLSearchParams({
          fields: 'status',
          access_token: pageAccessToken
        });

        const checkResponse = await fetch(`${checkUrl}?${checkParams.toString()}`);
        const checkData = await checkResponse.json();

        console.log(`Upload check ${attempts}/${maxAttempts}:`, checkData.status);

        if (checkData.status?.uploading_phase?.status === 'complete') {
          uploadComplete = true;
          console.log('Upload processing complete');
        }
      }

      if (!uploadComplete) {
        console.log('Upload still processing, proceeding to publish anyway...');
      }

      // Phase 3: Finish and publish the Reel (not as draft)
      console.log('Phase 3: Publishing Reel as PUBLISHED (not DRAFT)...');
      const finishParams = new URLSearchParams({
        upload_phase: 'finish',
        video_id: videoId,
        video_state: 'PUBLISHED', // PUBLISHED, DRAFT, or SCHEDULED
        description: message,
        access_token: pageAccessToken
      });

      const finishResponse = await fetch(reelsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: finishParams.toString()
      });

      const finishData = await finishResponse.json();

      if (!finishResponse.ok) {
        console.error('Failed to publish Reel:', finishData);
        throw new Error(finishData.error?.message || 'Failed to publish Facebook Reel');
      }

      console.log('Facebook Reel publish response:', finishData);

      // Use post_id if available, otherwise fall back to video_id
      const reelId = finishData.post_id || finishData.id || finishData.video_id || videoId;
      console.log('Facebook Reel FINISH complete, starting processing wait...');

      // Poll video status until truly published (up to 15 minutes)
      console.log('Polling video status until processing and publishing complete...');
      const maxPollingTime = 15 * 60 * 1000; // 15 minutes
      const pollingInterval = 7000; // 7 seconds
      const startTime = Date.now();
      let isPublished = false;
      let permalink = '';

      while (Date.now() - startTime < maxPollingTime && !isPublished) {
        await new Promise(resolve => setTimeout(resolve, pollingInterval));

        const statusUrl = `${this.baseUrl}/${videoId}`;
        const statusParams = new URLSearchParams({
          fields: 'status,permalink_url',
          access_token: pageAccessToken
        });

        const statusResponse = await fetch(`${statusUrl}?${statusParams.toString()}`);
        const statusData = await statusResponse.json();

        // All phase info is nested under 'status' when requesting 'fields=status'
        const processingStatus = statusData.status?.processing_phase?.status;
        const publishingStatus = statusData.status?.publishing_phase?.status;
        const copyrightStatus = statusData.status?.copyright_check_status?.status;
        const videoStatus = statusData.status?.video_status;
        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

        console.log(`Poll ${elapsedSeconds}s: processing=${processingStatus}, publishing=${publishingStatus}, copyright=${copyrightStatus}, video_status=${videoStatus}`);

        // Log full status object for debugging
        if (elapsedSeconds === 7 || (processingStatus === 'complete' && publishingStatus === 'complete')) {
          console.log('Full status response:', JSON.stringify(statusData, null, 2));
        }

        // Check for copyright blocks
        if (copyrightStatus === 'blocked' || copyrightStatus === 'requires_review') {
          throw new Error(`Reel blocked by copyright check (${copyrightStatus}). Please use original content without copyrighted music.`);
        }

        // Check if truly published - need ALL three phases complete
        // processing, publishing, AND copyright check must all be done
        // ALSO check that publish_status is NOT "draft"
        const copyrightPassed = copyrightStatus === 'passed' || copyrightStatus === 'complete';
        const publishStatus = statusData.status?.publishing_phase?.publish_status;
        const isNotDraft = publishStatus !== 'draft';

        if (processingStatus === 'complete' && publishingStatus === 'complete' && copyrightPassed && isNotDraft) {
          isPublished = true;
          permalink = statusData.permalink_url || '';
          console.log('Reel is live! (all checks passed, not draft)', permalink);
          break;
        } else if (processingStatus === 'complete' && publishingStatus === 'complete' && copyrightPassed && publishStatus === 'draft') {
          console.log(`Poll ${elapsedSeconds}s: WARNING - Reel marked as DRAFT, continuing to poll...`);
        }
      }

      if (!isPublished) {
        console.log('Reel processing timeout after 15 minutes');
        throw new Error('Reel processing timeout (15 minutes). The Reel may still publish later - check your Facebook page.');
      }

      // Fetch thumbnail URL for the published Reel
      console.log('Fetching Reel thumbnail...');
      const thumbnailUrl = await this.getVideoThumbnail(videoId, pageAccessToken);

      return {
        id: videoId,
        permalink: permalink,
        thumbnailUrl: thumbnailUrl
      } as { id: string; permalink?: string; thumbnailUrl?: string | null };
    } catch (error) {
      console.error('Facebook Reel posting error:', error);
      throw error;
    }
  }

  /**
   * Get video thumbnail URL from Facebook API
   */
  async getVideoThumbnail(
    videoId: string,
    pageAccessToken: string
  ): Promise<string | null> {
    try {
      console.log(`Fetching thumbnail for video ${videoId}...`);
      const url = `${this.baseUrl}/${videoId}`;
      const params = new URLSearchParams({
        fields: 'thumbnails',
        access_token: pageAccessToken
      });

      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to fetch video thumbnail:', data);
        return null;
      }

      const thumbnailUrl = data.thumbnails?.data?.[0]?.uri || null;
      if (thumbnailUrl) {
        console.log('Thumbnail URL retrieved:', thumbnailUrl);
      } else {
        console.log('No thumbnail found for video');
      }

      return thumbnailUrl;
    } catch (error) {
      console.error('Error fetching video thumbnail:', error);
      return null;
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