import { NextRequest, NextResponse } from 'next/server';
import { getValidThreadsToken } from '@/lib/threads/token-manager';

export async function POST(request: NextRequest) {
  try {
    const { userId, accessToken, text, mediaUrl, accountId } = await request.json();

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

    // Threads posting is a two-step process:
    // 1. Create a media container
    // 2. Publish the container

    let createParams: any = {
      media_type: 'TEXT',
      text: text,
      access_token: activeToken
    };

    // If there's a media URL, we need to handle it differently
    if (mediaUrl) {
      // For images, we need to upload to Threads first
      // Image posting requires the image to be publicly accessible
      createParams.media_type = 'IMAGE';
      createParams.image_url = mediaUrl;
      // Keep the text field for image posts - Threads uses 'text' for both text-only and image posts
      // The 'text' field serves as the caption for image posts
    }

    // Step 1: Create media container
    console.log('Creating Threads media container:', createParams);
    
    // Use 'me' endpoint instead of userId since the IDs don't match
    // Threads API prefers URL parameters
    const createUrlParams = new URLSearchParams(createParams);
    const createUrl = `https://graph.threads.net/v1.0/me/threads?${createUrlParams.toString()}`;
    
    const createResponse = await fetch(createUrl, {
      method: 'POST'
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
    const publishParams = {
      creation_id: containerId,
      access_token: activeToken
    };

    console.log('Publishing Threads post:', publishParams);
    
    // Use 'me' endpoint instead of userId since the IDs don't match
    // Threads API prefers URL parameters
    const publishUrlParams = new URLSearchParams(publishParams);
    const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish?${publishUrlParams.toString()}`;
    
    const publishResponse = await fetch(publishUrl, {
      method: 'POST'
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