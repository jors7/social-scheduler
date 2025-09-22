import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, accessToken, posts, mediaUrls = [], addNumbers = true } = await request.json();

    if (!userId || !accessToken || !posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields or invalid posts array' },
        { status: 400 }
      );
    }

    console.log(`Creating numbered thread with ${posts.length} posts`);
    console.log('Received mediaUrls:', mediaUrls);
    console.log('mediaUrls length:', mediaUrls.length);
    
    // First, get the Threads user ID
    const meResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`
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

    const publishedPosts = [];
    const totalPosts = posts.length;

    // Process each post in the thread sequentially
    for (let i = 0; i < posts.length; i++) {
      let postText = posts[i];
      const mediaUrl = mediaUrls[i]; // Optional media for this specific post
      
      console.log(`Post ${i + 1}: mediaUrl = "${mediaUrl}"`);
      
      // Add numbering if requested and there's more than one post
      if (addNumbers && totalPosts > 1) {
        postText = `[${i + 1}/${totalPosts}] ${postText}`;
      }
      
      try {
        // Step 1: Create media container for this post
        const formData = new URLSearchParams();
        formData.append('access_token', accessToken);
        
        if (mediaUrl) {
          console.log(`Post ${i + 1} has media, adding IMAGE type with URL: ${mediaUrl}`);
          formData.append('media_type', 'IMAGE');
          formData.append('image_url', mediaUrl);
          formData.append('caption', postText);
        } else {
          formData.append('media_type', 'TEXT');
          formData.append('text', postText);
        }
        
        const createUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
        
        console.log(`Creating container for post ${i + 1}/${posts.length}`);
        const createResponse = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        });

        const createData = await createResponse.json();
        
        if (!createResponse.ok || !createData.id) {
          console.error(`Failed to create container for post ${i + 1}:`, createData);
          throw new Error(createData.error?.message || 'Failed to create post container');
        }

        const containerId = createData.id;
        console.log(`Container created: ${containerId}`);

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
        console.log(`Post published: ${postId}`);
        
        publishedPosts.push({
          index: i,
          text: postText,
          originalText: posts[i],
          postId: postId,
          containerId: containerId
        });

        // Add a small delay between posts to avoid rate limiting and maintain order
        if (i < posts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
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
      message: `Thread created with ${publishedPosts.length} numbered posts`,
      posts: publishedPosts,
      totalPosts: posts.length,
      note: 'Posts are numbered but not connected as replies due to API permission requirements'
    });

  } catch (error) {
    console.error('Thread posting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create thread' },
      { status: 500 }
    );
  }
}