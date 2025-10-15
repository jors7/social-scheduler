import { ThreadsClient, ThreadsCredentials } from './client';

export class ThreadsService {
  private client: ThreadsClient;

  constructor(credentials: ThreadsCredentials) {
    this.client = new ThreadsClient(credentials);
  }

  async verifyCredentials() {
    return this.client.verifyCredentials();
  }

  async createPost(content: {
    text: string;
    imageUrl?: string;
    images?: Buffer[];
  }) {
    // Threads API requires image URLs, not direct uploads
    // Images should be uploaded to storage first and passed as imageUrl
    return this.client.createPost(content.text, content.imageUrl);
  }

  async getProfile() {
    return this.client.getProfile();
  }
}