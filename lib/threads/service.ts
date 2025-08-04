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
    images?: Buffer[];
  }) {
    // For now, Threads API requires image URLs, not direct uploads
    // In production, you'd upload images to your storage first
    return this.client.createPost(content.text);
  }

  async getProfile() {
    return this.client.getProfile();
  }
}