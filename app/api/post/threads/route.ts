import { NextRequest, NextResponse } from 'next/server';
import { getValidThreadsToken } from '@/lib/threads/token-manager';

export async function POST(request: NextRequest) {
  try {
    const { userId, accessToken, text, mediaUrl, accountId, replyControl } = await request.json();

    if (!userId || !accessToken || !text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check and refresh token if needed
    const { token: validToken, error: tokenError } = await getValidThreadsToken(accountId);
    
    if (tokenError || !validToken) {
      console.error('Token validation failed:', tokenError);
      return NextResponse.json(
        { 
          error: tokenError || 'Failed to get valid token',
          requiresReconnect: true 
        },
        { status: 401 }
      );
    }

    // Use the valid (possibly refreshed) token
    const activeToken = validToken;
    console.log('Using token for Threads post (possibly refreshed)');
    
    // First, get the Threads user ID
    const meResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${activeToken}`
    );
    
    if (!meResponse.ok) {
      const errorData = await meResponse.json();
      console.error('Failed to get Threads user ID:', errorData);
      return NextResponse.json(
        { error: 'Failed to get Threads user ID' },
        { status: 400 }
      );
    }
    
    const meData = await meResponse.json();
    const threadsUserId = meData.id;
    console.log('Threads user ID:', threadsUserId);

    // Threads posting is a two-step process:
    // 1. Create a media container
    // 2. Publish the container

    // Build form data for the request
    const formData = new URLSearchParams();
    formData.append('access_token', activeToken);

    if (mediaUrl) {
      // For image posts
      formData.append('media_type', 'IMAGE');
      formData.append('image_url', mediaUrl);
      formData.append('text', text); // Use 'text' for both text and image posts
    } else {
      // For text-only posts
      formData.append('media_type', 'TEXT');
      formData.append('text', text);
    }

    // Add reply control if specified
    if (replyControl) {
      formData.append('reply_control', replyControl);
    }

    // Step 1: Create media container
    console.log('Creating Threads media container');
    console.log('Form data:', formData.toString());
    
    // Use the user-specific endpoint with the Threads user ID
    const createUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
    
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const createData = await createResponse.json();
    console.log('Create container response:', {
      status: createResponse.status,
      data: createData
    });

    if (!createResponse.ok) {
      console.error('Failed to create Threads container:', createData);
      return NextResponse.json(
        { 
          error: createData.error?.message || 'Failed to create post',
          details: createData.error,
          status: createResponse.status
        },
        { status: 400 }
      );
    }

    if (!createData.id) {
      console.error('No container ID in response:', createData);
      return NextResponse.json(
        { 
          error: 'No container ID returned from Threads API',
          response: createData
        },
        { status: 400 }
      );
    }

    const containerId = createData.id;
    console.log('Container created with ID:', containerId);

    // Step 2: Publish the container
    const publishFormData = new URLSearchParams();
    publishFormData.append('creation_id', containerId);
    publishFormData.append('access_token', activeToken);

    console.log('Publishing Threads post with container ID:', containerId);
    
    const publishUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`;
    
    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: publishFormData.toString()
    });

    const publishData = await publishResponse.json();
    console.log('Publish response:', {
      status: publishResponse.status,
      data: publishData
    });

    if (!publishResponse.ok) {
      console.error('Failed to publish Threads post:', publishData);
      return NextResponse.json(
        { 
          error: publishData.error?.message || 'Failed to publish post',
          details: publishData.error,
          status: publishResponse.status,
          containerId: containerId
        },
        { status: 400 }
      );
    }

    // Log success details
    console.log('Threads post published successfully:', {
      postId: publishData.id,
      containerId: containerId,
      response: publishData
    });

    return NextResponse.json({
      success: true,
      id: publishData.id,
      containerId: containerId,
      fullResponse: publishData
    });

  } catch (error) {
    console.error('Threads posting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post to Threads' },
      { status: 500 }
    );
  }
}