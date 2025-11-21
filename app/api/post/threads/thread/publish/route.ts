import { NextRequest, NextResponse } from 'next/server';

/**
 * Phase 2: Publish Threads thread containers
 * Takes an array of container IDs and publishes them
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, accessToken, containerIds } = await request.json();

    if (!userId || !accessToken || !containerIds || !Array.isArray(containerIds) || containerIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields or invalid containerIds array' },
        { status: 400 }
      );
    }

    console.log(`[Phase 2] Publishing ${containerIds.length} thread containers for user ${userId}`);
    console.log('Container IDs:', containerIds);

    // Get the Threads user ID
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

    const publishedPosts = [];

    // Publish each container
    for (let i = 0; i < containerIds.length; i++) {
      const containerId = containerIds[i];

      try {
        console.log(`[Phase 2] Publishing container ${i + 1}/${containerIds.length}: ${containerId}`);

        const publishFormData = new URLSearchParams();
        publishFormData.append('creation_id', containerId);
        publishFormData.append('access_token', accessToken);

        const publishUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`;

        const publishResponse = await fetch(publishUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: publishFormData.toString()
        });

        const publishData = await publishResponse.json();

        if (!publishResponse.ok || !publishData.id) {
          console.error(`Failed to publish container ${containerId}:`, publishData);
          throw new Error(publishData.error?.message || 'Failed to publish container');
        }

        const postId = publishData.id;
        console.log(`[Phase 2] Container ${containerId} published as post ${postId}`);

        publishedPosts.push({
          index: i,
          containerId: containerId,
          postId: postId
        });

        // Add a small delay between publishes
        if (i < containerIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`Error publishing container ${containerId}:`, error);

        // Return partial success if some posts were published
        if (publishedPosts.length > 0) {
          return NextResponse.json({
            success: false,
            partial: true,
            message: `Published ${publishedPosts.length} out of ${containerIds.length} posts before error`,
            publishedPosts: publishedPosts,
            error: error instanceof Error ? error.message : 'Unknown error',
            failedAtIndex: i
          });
        } else {
          throw error;
        }
      }
    }

    console.log(`[Phase 2] All ${publishedPosts.length} containers published successfully`);

    return NextResponse.json({
      success: true,
      message: `Published ${publishedPosts.length} thread posts successfully`,
      threadId: publishedPosts[0]?.postId, // First post ID as thread ID
      posts: publishedPosts,
      totalPosts: containerIds.length
    });

  } catch (error) {
    console.error('[Phase 2] Thread publishing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish thread' },
      { status: 500 }
    );
  }
}
