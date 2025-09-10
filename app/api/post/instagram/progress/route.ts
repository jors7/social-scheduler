import { NextRequest } from 'next/server';
import { InstagramService } from '@/lib/instagram/service';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a stream for Server-Sent Events
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Process the request
  (async () => {
    try {
      const { userId, accessToken, text, mediaUrl, mediaUrls } = await request.json();

      if (!userId || !accessToken || !text) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Missing required fields' })}\n\n`));
        await writer.close();
        return;
      }

      // Instagram requires at least one media item
      const allMediaUrls = mediaUrls || (mediaUrl ? [mediaUrl] : []);
      
      if (allMediaUrls.length === 0) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Instagram posts require media' })}\n\n`));
        await writer.close();
        return;
      }

      // Get Instagram app secret from environment
      const appSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET;
      
      const service = new InstagramService({
        accessToken,
        userID: userId,
        appSecret: appSecret
      });

      // Create post with progress callback
      const result = await service.createPost({
        mediaUrls: allMediaUrls,
        caption: text,
        onProgress: (status: string, progress?: number) => {
          // Send progress update
          writer.write(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress', 
            status, 
            progress 
          })}\n\n`));
        }
      });

      // Fetch initial metrics for the post
      let metrics = {
        likes: 0,
        comments: 0,
        saves: 0,
        shares: 0,
        impressions: 0,
        reach: 0
      };

      if (result.id) {
        try {
          // Get the media object which includes like_count and comments_count
          const mediaResponse = await fetch(
            `https://graph.instagram.com/${result.id}?fields=like_count,comments_count&access_token=${accessToken}`
          );
          
          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            metrics.likes = mediaData.like_count || 0;
            metrics.comments = mediaData.comments_count || 0;
            console.log('Fetched Instagram post metrics:', metrics);
          }
        } catch (metricsError) {
          console.error('Error fetching Instagram metrics:', metricsError);
        }
      }

      // Send final result with metrics in the correct structure
      await writer.write(encoder.encode(`data: ${JSON.stringify({ 
        type: 'complete',
        success: true,
        postId: result.id,
        data: {
          id: result.id,
          metrics
        }
      })}\n\n`));
      
    } catch (error: any) {
      console.error('Instagram posting error:', error);
      await writer.write(encoder.encode(`data: ${JSON.stringify({ 
        type: 'error',
        error: error.message || 'Failed to post to Instagram',
        details: error
      })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}