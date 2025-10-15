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

      // Wait for container to be ready (polls status until FINISHED)
      // This is required for media posts (images/videos) to be processed
      if (imageUrl) {
        console.log('Media detected - waiting for container to be ready...');
        await this.waitForContainerReady(creationId);
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

  async checkContainerStatus(containerId: string): Promise<{
    status: string;
    statusCode: 'FINISHED' | 'IN_PROGRESS' | 'ERROR' | 'EXPIRED';
    errorMessage?: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseURL}/${containerId}?fields=status_code,status&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to check container status:', error);
        return {
          status: 'ERROR',
          statusCode: 'ERROR',
          errorMessage: error.error?.message || 'Failed to check status'
        };
      }

      const data = await response.json();
      return {
        status: data.status || 'Unknown',
        statusCode: data.status_code || 'ERROR',
        errorMessage: data.error?.message
      };
    } catch (error: any) {
      console.error('Error checking container status:', error);
      return {
        status: 'ERROR',
        statusCode: 'ERROR',
        errorMessage: error.message
      };
    }
  }

  async waitForContainerReady(containerId: string, maxWaitMs: number = 300000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds
    let attempts = 0;

    console.log(`Waiting for container ${containerId} to be ready...`);

    while (true) {
      attempts++;
      const elapsed = Date.now() - startTime;

      // Check if we've exceeded max wait time
      if (elapsed > maxWaitMs) {
        throw new Error(`Container processing timeout after ${Math.round(maxWaitMs / 1000)}s. Video may be too large or there may be a server issue.`);
      }

      // Check container status
      const statusResult = await this.checkContainerStatus(containerId);
      console.log(`Container status check #${attempts} (${Math.round(elapsed / 1000)}s elapsed):`, statusResult.statusCode);

      if (statusResult.statusCode === 'FINISHED') {
        console.log(`✅ Container ready after ${Math.round(elapsed / 1000)}s (${attempts} checks)`);
        return; // Container is ready!
      }

      if (statusResult.statusCode === 'ERROR') {
        throw new Error(`Container processing failed: ${statusResult.errorMessage || 'Unknown error'}`);
      }

      if (statusResult.statusCode === 'EXPIRED') {
        throw new Error('Container expired before processing completed');
      }

      // Still in progress, wait before next check
      await new Promise(resolve => setTimeout(resolve, pollInterval));
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
}