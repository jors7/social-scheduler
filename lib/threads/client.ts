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
      const response = await fetch(
        `${this.baseURL}/${this.userID}?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${this.accessToken}`
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
      // Create media container
      const createParams = new URLSearchParams({
        media_type: 'TEXT',
        text: text,
        access_token: this.accessToken,
      });

      if (imageUrl) {
        createParams.set('media_type', 'IMAGE');
        createParams.set('image_url', imageUrl);
      }

      const createResponse = await fetch(
        `${this.baseURL}/${this.userID}/threads`,
        {
          method: 'POST',
          body: createParams,
        }
      );

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(`Failed to create media container: ${JSON.stringify(error)}`);
      }

      const { id: creationId } = await createResponse.json();

      // Publish the thread
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
        profilePictureUrl: profile.threads_profile_picture_url,
        biography: profile.threads_biography,
      };
    } catch (error: any) {
      console.error('Error verifying Threads credentials:', error);
      throw new Error(`Verification failed: ${error.message}`);
    }
  }
}