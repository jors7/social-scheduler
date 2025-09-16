import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }
    
    console.log('=== Testing Threads Token Permissions ===');
    
    // Test 1: Get user info and verify token works
    const meResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`
    );
    
    const meData = await meResponse.json();
    
    if (!meResponse.ok) {
      return NextResponse.json({ 
        error: 'Token is invalid or expired',
        details: meData 
      }, { status: 400 });
    }
    
    // Test 2: Check token debug info (if available)
    const debugResponse = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    );
    
    let debugData = null;
    if (debugResponse.ok) {
      debugData = await debugResponse.json();
    }
    
    // Test 3: Try to create a simple text post container
    const testFormData = new URLSearchParams();
    testFormData.append('media_type', 'TEXT');
    testFormData.append('text', 'Permission test post');
    testFormData.append('access_token', accessToken);
    
    const createResponse = await fetch(
      `https://graph.threads.net/v1.0/${meData.id}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: testFormData.toString()
      }
    );
    
    const createData = await createResponse.json();
    const canCreatePost = createResponse.ok && createData.id;
    
    // Test 4: Try to create a post with reply_to_id (dry run - won't actually post)
    // We'll use a fake ID to test if the parameter is accepted
    const replyTestFormData = new URLSearchParams();
    replyTestFormData.append('media_type', 'TEXT');
    replyTestFormData.append('text', 'Reply permission test');
    replyTestFormData.append('reply_to_id', '12345678901234567'); // Fake ID
    replyTestFormData.append('access_token', accessToken);
    
    const replyTestResponse = await fetch(
      `https://graph.threads.net/v1.0/${meData.id}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: replyTestFormData.toString()
      }
    );
    
    const replyTestData = await replyTestResponse.json();
    
    // Analyze the error to understand if reply_to_id is supported
    let replySupport = 'unknown';
    if (replyTestResponse.ok) {
      replySupport = 'supported';
    } else if (replyTestData.error) {
      const errorMessage = replyTestData.error.message || '';
      if (errorMessage.includes('permission')) {
        replySupport = 'no_permission';
      } else if (errorMessage.includes('Invalid reply_to_id') || errorMessage.includes('does not exist')) {
        // This means the parameter is accepted but the ID is invalid (expected)
        replySupport = 'supported';
      } else {
        replySupport = 'not_supported';
      }
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: meData.id,
        username: meData.username
      },
      permissions: {
        canCreatePost,
        replyToIdSupport: replySupport,
        replyTestError: replyTestData.error || null
      },
      tokenDebug: debugData?.data || null,
      rawResponses: {
        createPost: createData,
        replyTest: replyTestData
      }
    });
    
  } catch (error) {
    console.error('Permission test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 });
  }
}