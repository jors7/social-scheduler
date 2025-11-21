export interface ThreadsCredentials {
  accessToken: string;
  userID: string;
}

export class ThreadsClient {
  private accessToken: string;
  private userID: string;
  private baseURL = 'https://graph.threads.net/v1.0';

  constructor(credentials: ThreadsCredentials) {
    this.accessToken = credentials.accessToken;
    this.userID = credentials.userID;
  }

  async getProfile() {
    try {
      // Get Instagram Business Account profile which is linked to Threads
      const response = await fetch(
        `${this.baseURL}/${this.userID}?fields=id,username,profile_picture_url,biography,followers_count,media_count&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get profile: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error getting Threads profile:', error);
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  async createPost(text: string, imageUrl?: string) {
    try {
      // Threads API posting through Instagram Graph API
      // Step 1: Create a Threads media container
      const createParams = new URLSearchParams({
        media_type: 'TEXT',
        text: text,
        access_token: this.accessToken,
      });

      let mediaType = 'TEXT';
      if (imageUrl) {
        // Detect if it's a video or image
        const videoExtensions = ['.mp4', '.mov', '.m4v'];
        const isVideo = videoExtensions.some(ext => imageUrl.toLowerCase().includes(ext));

        mediaType = isVideo ? 'VIDEO' : 'IMAGE';
        createParams.set('media_type', mediaType);
        createParams.set(isVideo ? 'video_url' : 'image_url', imageUrl);
      }

      console.log('=== Threads Create Container Debug ===');
      console.log('URL:', `${this.baseURL}/${this.userID}/threads`);
      console.log('User ID:', this.userID);
      console.log('Token length:', this.accessToken?.length);
      console.log('Token preview:', this.accessToken ? `${this.accessToken.substring(0, 30)}...` : 'null');
      console.log('Text:', text);
      console.log('Media type:', mediaType);
      console.log('Media URL:', imageUrl);

      // Use the threads endpoint for the Instagram Business Account
      const createResponse = await fetch(
        `${this.baseURL}/${this.userID}/threads`,
        {
          method: 'POST',
          body: createParams,
        }
      );

      console.log('Create response status:', createResponse.status);

      if (!createResponse.ok) {
        const error = await createResponse.json();
        console.error('=== Threads Container Creation Failed ===');
        console.error('Error:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to create Threads container: ${JSON.stringify(error)}`);
      }

      const { id: creationId } = await createResponse.json();

      console.log('Container created:', creationId);

      // Add delay to let Threads process the media
      // Threads needs time to download and process media before publishing
      // Based on testing: videos need ~30s, images need ~5s
      if (imageUrl) {
        const videoExtensions = ['.mp4', '.mov', '.m4v'];
        const isVideo = videoExtensions.some(ext => imageUrl.toLowerCase().includes(ext));
        const delay = isVideo ? 30000 : 5000; // 30s for videos, 5s for images
        console.log(`Waiting ${delay}ms for Threads to process ${isVideo ? 'video' : 'image'}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Step 2: Publish the Threads post
      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: this.accessToken,
      });

      const publishResponse = await fetch(
        `${this.baseURL}/${this.userID}/threads_publish`,
        {
          method: 'POST',
          body: publishParams,
        }
      );

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        throw new Error(`Failed to publish thread: ${JSON.stringify(error)}`);
      }

      return await publishResponse.json();
    } catch (error: any) {
      console.error('Error creating Threads post:', error);
      throw new Error(`Failed to create post: ${error.message}`);
    }
  }

  async verifyCredentials() {
    try {
      const profile = await this.getProfile();
      return {
        id: profile.id,
        username: profile.username,
        profilePictureUrl: profile.profile_picture_url,
        biography: profile.biography,
      };
    } catch (error: any) {
      console.error('Error verifying Threads credentials:', error);
      throw new Error(`Verification failed: ${error.message}`);
    }
  }

  /**
   * Phase 1: Create Threads container only (don't publish yet)
   * Use for video posts to allow proper status checking
   */
  async createContainerOnly(
    text: string,
    mediaUrl?: string
  ): Promise<{ containerId: string; mediaType: string }> {
    try {
      const createParams = new URLSearchParams({
        media_type: 'TEXT',
        text: text,
        access_token: this.accessToken,
      });

      let mediaType = 'TEXT';
      if (mediaUrl) {
        const videoExtensions = ['.mp4', '.mov', '.m4v'];
        const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));
        mediaType = isVideo ? 'VIDEO' : 'IMAGE';
        createParams.set('media_type', mediaType);
        createParams.set(isVideo ? 'video_url' : 'image_url', mediaUrl);
      }

      console.log('[Threads Phase 1] Creating container:', { mediaType, hasMedia: !!mediaUrl });

      const createResponse = await fetch(
        `${this.baseURL}/${this.userID}/threads`,
        {
          method: 'POST',
          body: createParams,
        }
      );

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(`Failed to create Threads container: ${JSON.stringify(error)}`);
      }

      const { id: containerId } = await createResponse.json();
      console.log('[Threads Phase 1] Container created:', containerId);

      return { containerId, mediaType };
    } catch (error: any) {
      console.error('Error creating Threads container:', error);
      throw new Error(`Failed to create container: ${error.message}`);
    }
  }

  /**
   * Check if Threads container is ready for publishing
   * Similar to Instagram's status checking
   */
  async checkContainerReady(containerId: string): Promise<{
    ready: boolean;
    status: string;
  }> {
    try {
      console.log('[Threads Phase 2] Checking container status:', containerId);

      // Threads uses same status endpoint as Instagram
      const statusUrl = `${this.baseURL}/${containerId}?fields=status&access_token=${this.accessToken}`;
      const statusResponse = await fetch(statusUrl);

      if (!statusResponse.ok) {
        console.error('Failed to check container status');
        return { ready: false, status: 'ERROR' };
      }

      const statusData = await statusResponse.json();
      const status = statusData.status || 'UNKNOWN';

      // Threads statuses: FINISHED, IN_PROGRESS, ERROR
      const ready = status === 'FINISHED';

      console.log('[Threads Phase 2] Container status:', { containerId, status, ready });

      if (status === 'ERROR') {
        throw new Error(`Threads container ${containerId} failed processing`);
      }

      return { ready, status };
    } catch (error: any) {
      console.error('Error checking Threads container:', error);
      throw new Error(`Failed to check container: ${error.message}`);
    }
  }

  /**
   * Phase 2: Publish a ready Threads container
   * Call this after checkContainerReady returns ready=true
   */
  async publishContainer(containerId: string): Promise<{ id: string }> {
    try {
      console.log('[Threads Phase 2] Publishing container:', containerId);

      const publishParams = new URLSearchParams({
        creation_id: containerId,
        access_token: this.accessToken,
      });

      const publishResponse = await fetch(
        `${this.baseURL}/${this.userID}/threads_publish`,
        {
          method: 'POST',
          body: publishParams,
        }
      );

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        throw new Error(`Failed to publish Threads container: ${JSON.stringify(error)}`);
      }

      const result = await publishResponse.json();
      console.log('[Threads Phase 2] Published successfully:', result.id);

      return result;
    } catch (error: any) {
      console.error('Error publishing Threads container:', error);
      throw new Error(`Failed to publish: ${error.message}`);
    }
  }
}