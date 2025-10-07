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

    const { postId, replyText, accountId } = await request.json();

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
      accountUsername: account.username
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

    // Step 2: Create media container for the reply
    const formData = new URLSearchParams();
    formData.append('access_token', accessToken);
    formData.append('media_type', 'TEXT');
    formData.append('text', replyText);
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
