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

      if (imageUrl) {
        // For Threads with images
        createParams.set('media_type', 'IMAGE');
        createParams.set('image_url', imageUrl);
      }

      console.log('=== Threads Create Container Debug ===');
      console.log('URL:', `${this.baseURL}/${this.userID}/threads`);
      console.log('User ID:', this.userID);
      console.log('Token length:', this.accessToken?.length);
      console.log('Token preview:', this.accessToken ? `${this.accessToken.substring(0, 30)}...` : 'null');
      console.log('Text:', text);
      console.log('Media type:', imageUrl ? 'IMAGE' : 'TEXT');

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
}