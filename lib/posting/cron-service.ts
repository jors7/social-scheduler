import { BlueskyService } from '@/lib/bluesky/service';
import { FacebookService } from '@/lib/facebook/service';
import { InstagramService } from '@/lib/instagram/service';
import { LinkedInService } from '@/lib/linkedin/service';
import { TwitterService } from '@/lib/twitter/service';
import { ThreadsService } from '@/lib/threads/service';
import { PinterestService, formatPinterestContent } from '@/lib/pinterest/service';
import { TikTokService } from '@/lib/tiktok/service';

export async function postToFacebookDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT FACEBOOK POST ===');
  console.log('Content:', content);
  console.log('Page ID:', account.platform_user_id);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);
  
  try {
    const facebookService = new FacebookService();
    let result;

    // Determine post type based on media
    if (!mediaUrls || mediaUrls.length === 0) {
      // Text-only post
      console.log('Creating text-only Facebook post');
      result = await facebookService.createPost(
        account.platform_user_id,
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
          account.platform_user_id,
          account.access_token,
          content,
          mediaUrl
        );
      } else {
        console.log('Creating Facebook photo post');
        result = await facebookService.createPhotoPost(
          account.platform_user_id,
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
        account.platform_user_id,
        account.access_token,
        content,
        imageUrls
      );
    }

    const resultWithThumbnail = result as any;
    return {
      success: true,
      id: result.id,
      thumbnailUrl: resultWithThumbnail.thumbnailUrl, // Include thumbnail URL if available
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

export async function postToInstagramDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT INSTAGRAM POST ===');
  console.log('Content:', content);
  console.log('Account ID:', account.platform_user_id);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  try {
    const instagramService = new InstagramService({
      accessToken: account.access_token,
      userID: account.platform_user_id,
      appSecret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET
    });

    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('Instagram posts require at least one media file');
    }

    const result = await instagramService.createPost({
      caption: content,
      mediaUrls: mediaUrls
    });

    return {
      success: true,
      id: result.id,
      message: 'Posted to Instagram successfully'
    };
  } catch (error) {
    console.error('Instagram posting error:', error);
    throw error;
  }
}

export async function postToLinkedInDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT LINKEDIN POST ===');
  console.log('Content:', content);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  try {
    const linkedInService = new LinkedInService(account.access_token, account.user_id);

    if (mediaUrls && mediaUrls.length > 0) {
      // Post with image (LinkedIn only supports one image)
      const imageUrl = mediaUrls[0];
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

      const result = await linkedInService.postWithImage(content, imageBuffer, mimeType);

      return {
        success: true,
        id: result.id,
        message: 'Posted to LinkedIn with image successfully'
      };
    } else {
      // Text-only post
      const result = await linkedInService.shareContent({ text: content });

      return {
        success: true,
        id: result.id,
        message: 'Posted to LinkedIn successfully'
      };
    }
  } catch (error) {
    console.error('LinkedIn posting error:', error);
    throw error;
  }
}

export async function postToTwitterDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT TWITTER POST ===');
  console.log('Content:', content);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  try {
    const twitterService = new TwitterService({
      accessToken: account.access_token,
      accessSecret: account.access_secret
    });

    if (mediaUrls && mediaUrls.length > 0) {
      // Upload media first
      const mediaIds: string[] = [];

      for (const mediaUrl of mediaUrls.slice(0, 4)) { // Twitter allows max 4 images
        const mediaResponse = await fetch(mediaUrl);
        const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());
        const mimeType = mediaResponse.headers.get('content-type') || 'image/jpeg';

        const mediaId = await twitterService.uploadMedia(mediaBuffer, mimeType);
        mediaIds.push(mediaId);
      }

      // Post with media
      const result = await twitterService.postTweet(content, mediaIds);

      return {
        success: true,
        id: result.id,
        message: 'Posted to Twitter with media successfully'
      };
    } else {
      // Text-only tweet
      const result = await twitterService.postTweet(content);

      return {
        success: true,
        id: result.id,
        message: 'Posted to Twitter successfully'
      };
    }
  } catch (error) {
    console.error('Twitter posting error:', error);
    throw error;
  }
}

export async function postToThreadsDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT THREADS POST ===');
  console.log('Content:', content);

  try {
    const threadsService = new ThreadsService({
      accessToken: account.access_token,
      userID: account.platform_user_id
    });

    const result = await threadsService.createPost({ text: content });

    return {
      success: true,
      id: result.id,
      message: 'Posted to Threads successfully'
    };
  } catch (error) {
    console.error('Threads posting error:', error);
    throw error;
  }
}

export async function postToPinterestDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT PINTEREST POST ===');
  console.log('Content:', content);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  try {
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('Pinterest posts require an image');
    }

    const pinterestService = new PinterestService(account.access_token);

    // Format content for Pinterest (title + description)
    const { title, description } = formatPinterestContent(content);

    // Pinterest requires a board_id - we'll use the first/default board
    // If board_id is stored in account, use that, otherwise fetch boards
    let boardId = account.board_id;

    if (!boardId) {
      const boards = await pinterestService.getBoards();
      if (boards.length === 0) {
        throw new Error('No Pinterest boards found. Please create a board first.');
      }
      boardId = boards[0].id;
    }

    const result = await pinterestService.createPin(
      boardId,
      title,
      description,
      mediaUrls[0] // Pinterest pins have one main image
    );

    return {
      success: true,
      id: result.id,
      message: 'Posted to Pinterest successfully'
    };
  } catch (error) {
    console.error('Pinterest posting error:', error);
    throw error;
  }
}

export async function postToTikTokDirect(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== DIRECT TIKTOK POST ===');
  console.log('Content:', content);
  console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);

  try {
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('TikTok posts require a video');
    }

    // TikTok only supports videos
    const videoUrl = mediaUrls[0];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    const isVideo = videoExtensions.some(ext => videoUrl.toLowerCase().includes(ext));

    if (!isVideo) {
      throw new Error('TikTok only supports video content');
    }

    const tiktokService = new TikTokService(account.access_token);

    // Format content for TikTok
    const formattedContent = TikTokService.formatContent(content);

    // Note: TikTok posting depends on app approval status
    // Check if app is unaudited (will force SELF_ONLY/draft mode)
    const result = await tiktokService.createPost(
      formattedContent,
      videoUrl,
      'PUBLIC_TO_EVERYONE' // Will be overridden to SELF_ONLY if app is unaudited
    );

    return {
      success: result.success,
      publishId: result.publishId,
      sandbox: result.sandbox,
      message: result.message
    };
  } catch (error) {
    console.error('TikTok posting error:', error);
    throw error;
  }
}