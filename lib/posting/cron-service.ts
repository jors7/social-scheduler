import { BlueskyService } from '@/lib/bluesky/service';

export async function postToFacebookDirect(content: string, account: any, mediaUrls?: string[]) {
  // Facebook integration temporarily disabled
  console.log('Facebook posting is currently disabled');
  return {
    success: false,
    error: 'Facebook integration is currently being rebuilt'
  };
}

export async function postToBlueskyDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT BLUESKY POST ===');
  console.log('Content:', JSON.stringify(content));
  console.log('Content length:', content.length);
  console.log('First 10 chars:', JSON.stringify(content.substring(0, 10)));
  console.log('Content type:', typeof content);
  
  // Make absolutely sure content is a string
  const textContent = String(content);
  console.log('Text content after String():', JSON.stringify(textContent));
  
  const blueskyService = new BlueskyService();
  const result = await blueskyService.createPost(
    account.access_token, // identifier stored in access_token
    account.access_secret, // password stored in access_secret
    textContent,
    mediaUrls
  );
  
  return {
    success: true,
    uri: result.uri,
    cid: result.cid,
    message: 'Posted to Bluesky successfully'
  };
}