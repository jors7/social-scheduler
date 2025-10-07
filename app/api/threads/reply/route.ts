import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidThreadsToken } from '@/lib/threads/token-manager';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, replyText, accountId, mediaUrl } = await request.json();

    if (!postId || !replyText) {
      return NextResponse.json(
        { error: 'Post ID and reply text are required' },
        { status: 400 }
      );
    }

    // Get Threads account with automatic token refresh
    const { token: accessToken, account, error: tokenError } = await getValidThreadsToken(accountId || undefined);

    if (tokenError || !accessToken) {
      console.error('Failed to get valid token:', tokenError);
      return NextResponse.json(
        {
          error: tokenError || 'Threads account not connected',
          needsReconnect: tokenError?.includes('reconnect') || false
        },
        { status: 404 }
      );
    }

    console.log('Creating reply to Threads post:', {
      postId,
      replyTextLength: replyText.length,
      accountUsername: account.username,
      hasMedia: !!mediaUrl
    });

    // Step 1: Get the Threads user ID
    const meResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`
    );

    if (!meResponse.ok) {
      const errorData = await meResponse.json();
      console.error('Failed to get Threads user ID:', errorData);
      return NextResponse.json(
        { error: 'Failed to get Threads user ID' },
        { status: 500 }
      );
    }

    const meData = await meResponse.json();
    const threadsUserId = meData.id;

    // Detect if media is video or image
    const isVideo = mediaUrl ? (
      mediaUrl.includes('.mp4') ||
      mediaUrl.includes('.mov') ||
      mediaUrl.includes('.webm') ||
      mediaUrl.toLowerCase().includes('video')
    ) : false;

    // Step 2: Create media container for the reply
    const formData = new URLSearchParams();
    formData.append('access_token', accessToken);

    // Set media type based on whether we have media and what type
    if (mediaUrl) {
      if (isVideo) {
        formData.append('media_type', 'VIDEO');
        formData.append('video_url', mediaUrl);
      } else {
        formData.append('media_type', 'IMAGE');
        formData.append('image_url', mediaUrl);
      }
      // For media posts, text is optional (caption)
      if (replyText) {
        formData.append('text', replyText);
      }
    } else {
      formData.append('media_type', 'TEXT');
      formData.append('text', replyText);
    }

    formData.append('reply_to_id', postId); // This makes it a reply

    const createUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;

    console.log('Creating reply container:', {
      endpoint: createUrl,
      reply_to_id: postId,
      threadsUserId
    });

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const createData = await createResponse.json();

    if (!createResponse.ok || !createData.id) {
      console.error('Failed to create reply container:', createData);
      return NextResponse.json(
        {
          error: createData.error?.message || 'Failed to create reply',
          details: createData.error
        },
        { status: 400 }
      );
    }

    const containerId = createData.id;
    console.log('Reply container created:', containerId);

    // Step 2.5: Wait for video processing if it's a video reply
    if (isVideo && mediaUrl) {
      console.log('Video reply detected, waiting for processing...');

      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max
      let isReady = false;

      while (attempts < maxAttempts && !isReady) {
        attempts++;

        const statusUrl = `https://graph.threads.net/v1.0/${containerId}?fields=status_code&access_token=${accessToken}`;
        const statusResponse = await fetch(statusUrl);

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log(`Video processing status check ${attempts}:`, statusData);

          if (statusData.status_code === 'FINISHED') {
            isReady = true;
            console.log('Video processing complete!');
          } else if (statusData.status_code === 'ERROR') {
            return NextResponse.json(
              { error: 'Video processing failed' },
              { status: 400 }
            );
          } else {
            // Still processing
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          }
        } else {
          console.warn('Failed to check video status, proceeding anyway');
          break;
        }
      }

      if (!isReady && attempts >= maxAttempts) {
        console.warn('Video processing timeout, attempting to publish anyway...');
      }
    }

    // Step 3: Publish the reply
    const publishParams = new URLSearchParams();
    publishParams.append('access_token', accessToken);
    publishParams.append('creation_id', containerId);

    const publishUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`;

    console.log('Publishing reply...');

    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: publishParams.toString()
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok || !publishData.id) {
      console.error('Failed to publish reply:', publishData);
      return NextResponse.json(
        {
          error: publishData.error?.message || 'Failed to publish reply',
          details: publishData.error
        },
        { status: 400 }
      );
    }

    const replyId = publishData.id;
    console.log('Reply published successfully:', replyId);

    return NextResponse.json({
      success: true,
      replyId,
      message: 'Reply posted successfully'
    });

  } catch (error) {
    console.error('Threads reply error:', error);
    return NextResponse.json(
      { error: 'Failed to post reply' },
      { status: 500 }
    );
  }
}
