import { BlueskyClient } from './client';

export class BlueskyService {
  async createPost(identifier: string, password: string, text: string, mediaUrls?: string[]) {
    try {
      const client = new BlueskyClient();
      
      // Login to Bluesky
      await client.login({ identifier, password });
      
      // Download images if provided
      let imageBuffers: Buffer[] = [];
      if (mediaUrls && mediaUrls.length > 0) {
        for (const url of mediaUrls) {
          try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            imageBuffers.push(Buffer.from(arrayBuffer));
          } catch (error) {
            console.error('Failed to download image:', url, error);
          }
        }
      }
      
      // Create the post with images if any
      const result = await client.createPost(text, imageBuffers.length > 0 ? imageBuffers : undefined);
      
      return {
        uri: result.post.uri,
        cid: result.post.cid,
      };
    } catch (error) {
      console.error('Bluesky service error:', error);
      throw error;
    }
  }

  async getUserProfile(identifier: string, password: string) {
    try {
      const client = new BlueskyClient();
      
      // Login to Bluesky
      const session = await client.login({ identifier, password });
      
      return {
        did: session.session.did,
        handle: session.session.handle,
        displayName: (session.session as any).displayName || session.session.handle,
        avatar: (session.session as any).avatar,
      };
    } catch (error) {
      console.error('Bluesky profile error:', error);
      throw error;
    }
  }
}