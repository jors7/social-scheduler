import { NextRequest, NextResponse } from 'next/server';
import { InstagramService } from '@/lib/instagram/service';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, accessToken, text, mediaUrl, mediaUrls, isStory, isReel, currentUserId } = body;

    if (!userId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Stories and Reels don't require captions, but feed posts do
    if (!isStory && !isReel && !text) {
      return NextResponse.json(
        { error: 'Caption is required for feed posts' },
        { status: 400 }
      );
    }

    // Instagram requires at least one media item
    const allMediaUrls = mediaUrls || (mediaUrl ? [mediaUrl] : []);
    
    if (allMediaUrls.length === 0) {
      return NextResponse.json(
        { error: 'Instagram posts require at least one image or video' },
        { status: 400 }
      );
    }

    console.log('Creating Instagram post:', {
      userId,
      hasToken: !!accessToken,
      textLength: text?.length || 0,
      mediaCount: allMediaUrls.length,
      isCarousel: allMediaUrls.length > 1,
      isStory: !!isStory,
      isReel: !!isReel
    });

    // Get Instagram app secret from environment
    const appSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET;

    console.log('Instagram API endpoint:', {
      hasAppSecret: !!appSecret,
      secretStart: appSecret ? appSecret.substring(0, 4) + '...' : 'none'
    });

    const service = new InstagramService({
      accessToken,
      userID: userId,
      appSecret: appSecret
    });

    const result = await service.createPost({
      mediaUrls: allMediaUrls,
      caption: text || '',
      isStory: isStory,
      isReel: isReel
    });

    const postType = isStory ? 'story' : isReel ? 'reel' : 'post';
    console.log(`Instagram ${postType} created:`, result);

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

          console.log('Instagram Story media data:', mediaData);

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
        console.error('Error fetching Instagram Story thumbnail:', thumbnailError);
        // Continue without thumbnail if fetch fails
      }
    }

    // Fetch initial metrics for the post (likes and comments)
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
        // First get the media object which includes like_count and comments_count
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
        // Continue without metrics if fetch fails
      }
    }

    const response: any = {
      success: true,
      id: result.id,
      type: isStory ? 'story' : isReel ? 'reel' : 'post',
      metrics,
      ...result
    };

    // Include thumbnail URL if available (for stories and reels)
    if (thumbnailUrl) {
      response.thumbnailUrl = thumbnailUrl;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Instagram posting error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to post to Instagram',
        details: error
      },
      { status: 500 }
    );
  }
}