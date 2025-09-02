import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, accessToken, posts, mediaUrls = [] } = await request.json();

    if (!userId || !accessToken || !posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields or invalid posts array' },
        { status: 400 }
      );
    }

    console.log(`Creating thread with ${posts.length} posts`);

    const publishedPosts = [];
    let previousPostId = null;

    // Process each post in the thread sequentially
    for (let i = 0; i < posts.length; i++) {
      const postText = posts[i];
      const mediaUrl = mediaUrls[i]; // Optional media for this specific post
      
      try {
        // Step 1: Create media container for this post
        let createParams: any = {
          media_type: mediaUrl ? 'IMAGE' : 'TEXT',
          access_token: accessToken
        };

        if (mediaUrl) {
          createParams.image_url = mediaUrl;
          createParams.caption = postText;
        } else {
          createParams.text = postText;
        }

        // If this is not the first post, add reply_to_id to create a thread
        // This requires the threads_manage_replies permission
        if (previousPostId) {
          createParams.reply_to_id = previousPostId;
          console.log(`Creating reply to post ${previousPostId}`);
        }

        const createUrlParams = new URLSearchParams(createParams);
        const createUrl = `https://graph.threads.net/v1.0/me/threads?${createUrlParams.toString()}`;
        
        console.log(`Creating container for post ${i + 1}/${posts.length}`);
        const createResponse = await fetch(createUrl, {
          method: 'POST'
        });

        const createData = await createResponse.json();
        
        if (!createResponse.ok || !createData.id) {
          console.error(`Failed to create container for post ${i + 1}:`, createData);
          throw new Error(createData.error?.message || 'Failed to create post container');
        }

        const containerId = createData.id;
        console.log(`Container created: ${containerId}`);

        // Step 2: Publish this post
        const publishParams = {
          creation_id: containerId,
          access_token: accessToken
        };

        const publishUrlParams = new URLSearchParams(publishParams);
        const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish?${publishUrlParams.toString()}`;
        
        console.log(`Publishing post ${i + 1}/${posts.length}`);
        const publishResponse = await fetch(publishUrl, {
          method: 'POST'
        });

        const publishData = await publishResponse.json();
        
        if (!publishResponse.ok || !publishData.id) {
          console.error(`Failed to publish post ${i + 1}:`, publishData);
          throw new Error(publishData.error?.message || 'Failed to publish post');
        }

        const postId = publishData.id;
        console.log(`Post published: ${postId}`);
        
        publishedPosts.push({
          index: i,
          text: postText,
          postId: postId,
          containerId: containerId,
          isReply: previousPostId !== null
        });

        // Update previousPostId for the next iteration
        previousPostId = postId;

        // Add a small delay between posts to avoid rate limiting
        if (i < posts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }

      } catch (error) {
        console.error(`Error processing post ${i + 1}:`, error);
        
        // Return partial success if some posts were published
        if (publishedPosts.length > 0) {
          return NextResponse.json({
            success: false,
            partial: true,
            message: `Published ${publishedPosts.length} out of ${posts.length} posts before error`,
            publishedPosts: publishedPosts,
            error: error instanceof Error ? error.message : 'Unknown error',
            failedAtIndex: i
          });
        } else {
          throw error; // Re-throw if no posts were published
        }
      }
    }

    console.log(`Thread created successfully with ${publishedPosts.length} posts`);

    return NextResponse.json({
      success: true,
      message: `Thread created with ${publishedPosts.length} posts`,
      threadId: publishedPosts[0]?.postId, // First post ID can be considered the thread ID
      posts: publishedPosts,
      totalPosts: posts.length
    });

  } catch (error) {
    console.error('Thread posting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create thread' },
      { status: 500 }
    );
  }
}