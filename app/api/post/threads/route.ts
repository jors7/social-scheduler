import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, accessToken, text, mediaUrl } = await request.json();

    if (!userId || !accessToken || !text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Threads posting is a two-step process:
    // 1. Create a media container
    // 2. Publish the container

    let createParams: any = {
      media_type: 'TEXT',
      text: text,
      access_token: accessToken
    };

    // If there's a media URL, we need to handle it differently
    if (mediaUrl) {
      // For images, we need to upload to Threads first
      // For now, we'll just do text posts
      // Image posting requires the image to be publicly accessible
      createParams.media_type = 'IMAGE';
      createParams.image_url = mediaUrl;
      createParams.caption = text; // When posting images, text becomes caption
      delete createParams.text;
    }

    // Step 1: Create media container
    console.log('Creating Threads media container:', createParams);
    
    const createUrl = `https://graph.threads.net/v1.0/${userId}/threads`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createParams)
    });

    const createData = await createResponse.json();
    console.log('Create container response:', createData);

    if (!createResponse.ok) {
      console.error('Failed to create Threads container:', createData);
      return NextResponse.json(
        { error: createData.error?.message || 'Failed to create post' },
        { status: 400 }
      );
    }

    const containerId = createData.id;

    // Step 2: Publish the container
    const publishParams = {
      creation_id: containerId,
      access_token: accessToken
    };

    console.log('Publishing Threads post:', publishParams);
    
    const publishUrl = `https://graph.threads.net/v1.0/${userId}/threads_publish`;
    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(publishParams)
    });

    const publishData = await publishResponse.json();
    console.log('Publish response:', publishData);

    if (!publishResponse.ok) {
      console.error('Failed to publish Threads post:', publishData);
      return NextResponse.json(
        { error: publishData.error?.message || 'Failed to publish post' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      id: publishData.id,
      containerId: containerId
    });

  } catch (error) {
    console.error('Threads posting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post to Threads' },
      { status: 500 }
    );
  }
}