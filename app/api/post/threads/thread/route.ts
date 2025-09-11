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

    console.log(`Creating connected thread with ${posts.length} posts for user ${userId}`);
    console.log('Posts to create:', posts.map((p, i) => `Post ${i + 1}: ${p.substring(0, 30)}...`));
    console.log('Access token preview:', accessToken ? `${accessToken.substring(0, 20)}...` : 'null');

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
          console.log(`Adding reply_to_id to post ${i + 1}: reply_to_id=${previousPostId}`);
        } else {
          console.log(`Post ${i + 1} is the first post, no reply_to_id needed`);
        }

        const createUrlParams = new URLSearchParams(createParams);
        const createUrl = `https://graph.threads.net/v1.0/me/threads?${createUrlParams.toString()}`;
        
        console.log(`Creating container for post ${i + 1}/${posts.length}`);
        if (i > 0) {
          console.log(`Request params include reply_to_id: ${createParams.reply_to_id}`);
        }
        const createResponse = await fetch(createUrl, {
          method: 'POST'
        });

        const createData = await createResponse.json();
        
        if (!createResponse.ok || !createData.id) {
          console.error(`Failed to create container for post ${i + 1}:`, {
            status: createResponse.status,
            statusText: createResponse.statusText,
            data: createData,
            error: createData.error,
            errorCode: createData.error?.code,
            errorType: createData.error?.type,
            errorMessage: createData.error?.message,
            postIndex: i,
            isReply: i > 0,
            previousPostId: previousPostId
          });
          
          // Check if this is a permission error related to reply_to_id
          const errorMessage = createData.error?.message || '';
          const errorCode = createData.error?.code;
          const errorType = createData.error?.type;
          
          // Treat it as a permission error if:
          // 1. We're trying to create a reply (i > 0 and previousPostId exists)
          // 2. The error mentions permission OR has code 10 (permission error)
          // This catches "Application does not have permission for this action" errors
          if (i > 0 && previousPostId && 
              (errorMessage.toLowerCase().includes('permission') || 
               errorMessage.includes('reply_to_id') || 
               errorMessage.includes('threads_manage_replies') ||
               errorCode === 10 || // Permission error code
               errorType === 'THApiException')) {
            console.log('Permission error detected for reply (likely reply_to_id issue), throwing specific error');
            throw new Error('threads_manage_replies permission required for connected threads. Please use numbered threads instead.');
          }
          
          // For other errors, just throw them as is
          console.log('Non-permission error, throwing generic error');
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
        console.log(`Post ${i + 1} published successfully:`, {
          postId: postId,
          containerId: containerId,
          isReply: previousPostId !== null,
          replyToId: previousPostId,
          text: postText.substring(0, 50) + '...'
        });
        
        publishedPosts.push({
          index: i,
          text: postText,
          postId: postId,
          containerId: containerId,
          isReply: previousPostId !== null
        });

        // Update previousPostId for the next iteration
        previousPostId = postId;
        console.log(`Setting previousPostId for next post: ${previousPostId}`);

        // Add a longer delay between posts to avoid rate limiting
        // Especially important when creating connected threads
        if (i < posts.length - 1) {
          const delay = 2000; // 2 seconds delay
          console.log(`Waiting ${delay}ms before creating next post...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`Error processing post ${i + 1}:`, error);
        
        // If this is a permission error, throw it immediately to trigger fallback
        if (error instanceof Error && 
            error.message.includes('threads_manage_replies permission required')) {
          throw error; // Re-throw permission error to trigger client-side fallback
        }
        
        // Return partial success if some posts were published (for other errors)
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
      message: `Connected thread created with ${publishedPosts.length} posts`,
      threadId: publishedPosts[0]?.postId, // First post ID can be considered the thread ID
      posts: publishedPosts,
      totalPosts: posts.length,
      isConnectedThread: true, // Indicates this created real connected replies
      note: 'Successfully created connected thread using reply_to_id'
    });

  } catch (error) {
    console.error('Thread posting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create thread' },
      { status: 500 }
    );
  }
}