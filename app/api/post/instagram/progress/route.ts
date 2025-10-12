import { NextRequest } from 'next/server';
import { InstagramService } from '@/lib/instagram/service';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a stream for Server-Sent Events
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Process the request
  (async () => {
    try {
      const { userId, accessToken, text, mediaUrl, mediaUrls, isStory, isReel, currentUserId } = await request.json();

      if (!userId || !accessToken) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Missing required fields' })}\n\n`));
        await writer.close();
        return;
      }

      // Stories and Reels don't require captions, but feed posts do
      if (!isStory && !isReel && !text) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Caption is required for feed posts' })}\n\n`));
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
        isStory: isStory,
        isReel: isReel,
        onProgress: (status: string, progress?: number) => {
          // Send progress update
          writer.write(encoder.encode(`data: ${JSON.stringify({
            type: 'progress',
            status,
            progress
          })}\n\n`));
        }
      });

      // Fetch thumbnail for stories and reels (similar to Facebook Reels)
      let thumbnailUrl = null;
      if ((isStory || isReel) && result.id && currentUserId) {
        try {
          console.log('Fetching Instagram Story/Reel thumbnail...');

          // Fetch media information including thumbnail_url
          const mediaResponse = await fetch(
            `https://graph.instagram.com/${result.id}?fields=media_url,thumbnail_url,media_type&access_token=${accessToken}`
          );

          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            const thumbUrl = mediaData.thumbnail_url || mediaData.media_url;

            console.log('Instagram Story/Reel media data:', mediaData);

            if (thumbUrl) {
              // Download thumbnail from Instagram CDN
              console.log('Downloading thumbnail from Instagram CDN...');
              const thumbnailResponse = await fetch(thumbUrl);

              if (thumbnailResponse.ok) {
                const thumbnailBlob = await thumbnailResponse.blob();
                const thumbnailBuffer = await thumbnailBlob.arrayBuffer();
                console.log(`Thumbnail downloaded: ${thumbnailBuffer.byteLength} bytes`);

                // Upload to Supabase Storage
                const supabase = createClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL!,
                  process.env.SUPABASE_SERVICE_ROLE_KEY!
                );

                const filename = `thumbnails/${currentUserId}/${result.id}.jpg`;
                console.log('Uploading thumbnail to Supabase Storage:', filename);

                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('post-media')
                  .upload(filename, thumbnailBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true
                  });

                if (uploadError) {
                  console.error('Failed to upload thumbnail to Supabase:', uploadError);
                } else {
                  // Get public URL
                  const { data: urlData } = supabase.storage
                    .from('post-media')
                    .getPublicUrl(filename);

                  thumbnailUrl = urlData.publicUrl;
                  console.log('Thumbnail uploaded successfully:', thumbnailUrl);
                }
              }
            }
          }
        } catch (thumbnailError) {
          console.error('Error fetching Instagram Story/Reel thumbnail:', thumbnailError);
          // Continue without thumbnail if fetch fails
        }
      }

      // Fetch initial metrics for the post
      let metrics = {
        likes: 0,
        comments: 0,
        saves: 0,
        shares: 0,
        impressions: 0,
        reach: 0
      };

      // Only fetch metrics for feed posts (not stories or reels)
      if (!isStory && !isReel && result.id) {
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

      // Send final result with metrics and thumbnail in the correct structure
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'complete',
        success: true,
        id: result.id,
        type: isStory ? 'story' : isReel ? 'reel' : 'post',
        thumbnailUrl: thumbnailUrl,
        metrics
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