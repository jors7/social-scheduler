import { FacebookClient } from '@/lib/facebook/client';
import { BlueskyService } from '@/lib/bluesky/service';

export async function postToFacebookDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT FACEBOOK POST ===');
  console.log('Content:', content);
  console.log('Content length:', content.length);
  
  const facebookClient = new FacebookClient();
  const result = await facebookClient.postToPage(
    account.platform_user_id,
    account.access_token,
    content,
    mediaUrls
  );
  
  return {
    success: true,
    id: result.id,
    message: 'Posted to Facebook successfully'
  };
}

export async function postToBlueskyDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT BLUESKY POST ===');
  console.log('Content:', content);
  console.log('Content length:', content.length);
  
  const blueskyService = new BlueskyService();
  const result = await blueskyService.createPost(
    account.access_token, // identifier stored in access_token
    account.access_secret, // password stored in access_secret
    content,
    mediaUrls
  );
  
  return {
    success: true,
    uri: result.uri,
    cid: result.cid,
    message: 'Posted to Bluesky successfully'
  };
}