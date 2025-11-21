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
    
    // First, get the Threads user ID (different from Instagram user ID)
    console.log('Getting Threads user ID...');
    const meResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`
    );
    
    if (!meResponse.ok) {
      const errorData = await meResponse.json();
      console.error('Failed to get Threads user ID:', errorData);
      throw new Error('Failed to get Threads user ID');
    }
    
    const meData = await meResponse.json();
    const threadsUserId = meData.id;
    console.log('Threads user ID retrieved:', threadsUserId);

    // Note: We're using threads_content_publish only, no threads_manage_replies needed
    // The reply_to_id parameter works with threads_basic + threads_content_publish
    if (posts.length > 1) {
      console.log('Multiple posts detected - creating thread with reply_to_id');
    }

    const publishedPosts = [];
    let firstPostId: string | null = null; // Store first post ID for thread replies
    let previousPostId = null;

    // Process each post in the thread sequentially
    for (let i = 0; i < posts.length; i++) {
      const postText = posts[i];
      const mediaUrl = mediaUrls[i]; // Optional media for this specific post
      
      try {
        // Step 1: Create media container for this post
        // Use form data for the POST request
        const formData = new URLSearchParams();
        formData.append('access_token', accessToken);
        
        if (mediaUrl) {
          // Determine if media is video or image
          const videoExtensions = ['.mp4', '.mov', '.m4v', '.avi', '.wmv', '.flv', '.webm'];
          const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().endsWith(ext));

          if (isVideo) {
            formData.append('media_type', 'VIDEO');
            formData.append('video_url', mediaUrl);
            formData.append('caption', postText);
          } else {
            formData.append('media_type', 'IMAGE');
            formData.append('image_url', mediaUrl);
            formData.append('caption', postText);
          }
        } else {
          formData.append('media_type', 'TEXT');
          formData.append('text', postText);
        }
        
        // Note: reply_control parameter removed - it requires additional permissions

        // If this is not the first post, add reply_to_id to create a thread
        // All replies should reply to the FIRST post to create a proper thread structure
        if (firstPostId) {
          formData.append('reply_to_id', firstPostId);
          console.log(`Adding reply_to_id to post ${i + 1}:`, {
            reply_to_id: firstPostId,
            postNumber: i + 1,
            totalPosts: posts.length
          });
        } else {
          console.log(`Post ${i + 1} is the first post, no reply_to_id needed`);
        }

        // Use the correct endpoint with threads_user_id
        const createUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
        
        console.log(`Creating container for post ${i + 1}/${posts.length}`);
        console.log('Request details:', {
          endpoint: createUrl,
          isReply: i > 0,
          formData: formData.toString(),
          hasReplyToId: formData.has('reply_to_id'),
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
          
          // Check if this is a reply_to_id related error
          if (i > 0 && previousPostId) {
            console.log('Reply creation failed. Error details:', {
              errorMessage,
              errorCode,
              errorType,
              errorSubcode: createData.error?.error_subcode,
              isReply: true,
              replyToId: previousPostId
            });
            
            // Only throw for permission errors (code 10)
            // For other errors (like timing issues), throw with details
            if (errorCode === 10) {
              throw new Error(`Permission denied for thread reply: ${errorMessage}`);
            } else {
              throw new Error(`Thread reply failed (code ${errorCode}): ${errorMessage}`);
            }
          }
          
          // For the first post or other errors, just throw them as is
          throw new Error(createData.error?.message || 'Failed to create post container');
        }

        const containerId = createData.id;
        console.log(`Container created: ${containerId}`);

        // Add delay for media processing
        // Threads needs time to download and process media before publishing
        if (mediaUrl) {
          const videoExtensions = ['.mp4', '.mov', '.m4v'];
          const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));
          const delay = isVideo ? 30000 : 3000; // 30s for videos, 3s for images (reduced from 5s)
          console.log(`Waiting ${delay}ms for Threads to process ${isVideo ? 'video' : 'image'}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Step 2: Publish this post
        const publishFormData = new URLSearchParams();
        publishFormData.append('creation_id', containerId);
        publishFormData.append('access_token', accessToken);
        
        const publishUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`;
        
        console.log(`Publishing post ${i + 1}/${posts.length}`);
        const publishResponse = await fetch(publishUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: publishFormData.toString()
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

        // Store first post ID for thread replies
        if (i === 0) {
          firstPostId = postId;
          console.log(`Stored first post ID for thread replies: ${firstPostId}`);
        }

        // Keep previousPostId for backward compatibility (not used for reply_to_id anymore)
        previousPostId = postId;

        // Add a delay between posts to ensure the post is fully processed
        // Threads needs time to make the post available as a reply target
        if (i < posts.length - 1) {
          const delay = 5000; // 5 seconds delay (reduced from 10s to avoid timeout)
          console.log(`Waiting ${delay}ms for post to be fully processed before creating reply...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`Error processing post ${i + 1}:`, error);
        
        // Re-throw the error to trigger fallback in client
        if (error instanceof Error && i > 0) {
          // This is likely a reply_to_id issue
          throw new Error(`Thread creation failed at post ${i + 1}: ${error.message}`);
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

    // Get the first media URL for thumbnail (if any)
    const firstMediaUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : undefined;

    return NextResponse.json({
      success: true,
      message: `Connected thread created with ${publishedPosts.length} posts`,
      threadId: publishedPosts[0]?.postId, // First post ID can be considered the thread ID
      posts: publishedPosts,
      totalPosts: posts.length,
      isConnectedThread: true, // Indicates this created real connected replies
      note: 'Successfully created connected thread using reply_to_id with threads_content_publish',
      thumbnailUrl: firstMediaUrl // Include first media URL as thumbnail
    });

  } catch (error) {
    console.error('Thread posting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create thread' },
      { status: 500 }
    );
  }
}