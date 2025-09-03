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
      const { userId, accessToken, text, mediaUrl } = await request.json();

      if (!userId || !accessToken || !text) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Missing required fields' })}\n\n`));
        await writer.close();
        return;
      }

      if (!mediaUrl) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Instagram posts require media' })}\n\n`));
        await writer.close();
        return;
      }

      // Get Instagram app secret from environment
      const appSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET;
      
      // Detect if media is a video
      const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
      const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));
      
      const service = new InstagramService({
        accessToken,
        userID: userId,
        appSecret: appSecret
      });

      // Create post with progress callback
      const result = await service.createPost({
        mediaUrl: mediaUrl,
        caption: text,
        isVideo: isVideo,
        onProgress: (status: string, progress?: number) => {
          // Send progress update
          writer.write(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress', 
            status, 
            progress 
          })}\n\n`));
        }
      });

      // Send final result
      await writer.write(encoder.encode(`data: ${JSON.stringify({ 
        type: 'complete',
        success: true,
        id: result.id,
        ...result
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