import { BlueskyService } from '@/lib/bluesky/service';

import { FacebookService } from '@/lib/facebook/service';

export async function postToFacebookDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT FACEBOOK POST ===');
  console.log('Content:', content);
  console.log('Page ID:', account.account_id);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);
  
  try {
    const facebookService = new FacebookService();
    let result;

    // Determine post type based on media
    if (!mediaUrls || mediaUrls.length === 0) {
      // Text-only post
      console.log('Creating text-only Facebook post');
      result = await facebookService.createPost(
        account.account_id,
        account.access_token,
        content
      );
    } else if (mediaUrls.length === 1) {
      // Single media post
      const mediaUrl = mediaUrls[0];
      const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
      const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));

      if (isVideo) {
        console.log('Creating Facebook video post');
        result = await facebookService.createVideoPost(
          account.account_id,
          account.access_token,
          content,
          mediaUrl
        );
      } else {
        console.log('Creating Facebook photo post');
        result = await facebookService.createPhotoPost(
          account.account_id,
          account.access_token,
          content,
          mediaUrl
        );
      }
    } else {
      // Multiple photos (carousel)
      const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
      const imageUrls = mediaUrls.filter(url => 
        !videoExtensions.some(ext => url.toLowerCase().includes(ext))
      );

      if (imageUrls.length === 0) {
        throw new Error('Facebook does not support multiple videos in a single post');
      }

      console.log(`Creating Facebook carousel post with ${imageUrls.length} images`);
      result = await facebookService.createCarouselPost(
        account.account_id,
        account.access_token,
        content,
        imageUrls
      );
    }

    return {
      success: true,
      id: result.id,
      message: 'Posted to Facebook successfully'
    };
  } catch (error) {
    console.error('Facebook posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
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