import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }
    
    console.log('=== Debug Threads Reply Creation ===');
    
    // Step 1: Get user info
    const meResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`
    );
    
    const userData = await meResponse.json();
    if (!meResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to get user info',
        details: userData 
      }, { status: 400 });
    }
    
    const threadsUserId = userData.id;
    console.log('User ID:', threadsUserId);
    
    // Step 2: Create a simple starter post first
    const starterBody = new URLSearchParams();
    starterBody.append('media_type', 'TEXT');
    starterBody.append('text', `Debug Thread Starter - ${new Date().toISOString()}`);
    starterBody.append('access_token', accessToken);
    
    console.log('Creating starter with body:', starterBody.toString());
    
    const starterCreateResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: starterBody.toString()
      }
    );
    
    const starterCreateData = await starterCreateResponse.json();
    console.log('Starter create response:', starterCreateData);
    
    if (!starterCreateResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to create starter',
        details: starterCreateData 
      }, { status: 400 });
    }
    
    // Publish the starter
    const publishBody = new URLSearchParams();
    publishBody.append('creation_id', starterCreateData.id);
    publishBody.append('access_token', accessToken);
    
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishBody.toString()
      }
    );
    
    const publishData = await publishResponse.json();
    console.log('Publish response:', publishData);
    
    if (!publishResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to publish starter',
        details: publishData 
      }, { status: 400 });
    }
    
    const starterPostId = publishData.id;
    console.log('Starter published with ID:', starterPostId);
    
    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Now try to create a reply with different approaches
    const results = [];
    
    // Approach 1: reply_to_id in body (standard approach)
    console.log('\n=== Approach 1: reply_to_id in body ===');
    const reply1Body = new URLSearchParams();
    reply1Body.append('media_type', 'TEXT');
    reply1Body.append('text', 'Reply Approach 1 - reply_to_id in body');
    reply1Body.append('reply_to_id', starterPostId);
    reply1Body.append('access_token', accessToken);
    
    console.log('Reply body:', reply1Body.toString());
    
    const reply1Response = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: reply1Body.toString()
      }
    );
    
    const reply1Data = await reply1Response.json();
    console.log('Reply 1 response:', reply1Data);
    
    results.push({
      approach: 'reply_to_id in body',
      success: reply1Response.ok,
      response: reply1Data,
      status: reply1Response.status
    });
    
    // Approach 2: Try with reply_control parameter
    console.log('\n=== Approach 2: with reply_control ===');
    const reply2Body = new URLSearchParams();
    reply2Body.append('media_type', 'TEXT');
    reply2Body.append('text', 'Reply Approach 2 - with reply_control');
    reply2Body.append('reply_to_id', starterPostId);
    reply2Body.append('reply_control', 'everyone');
    reply2Body.append('access_token', accessToken);
    
    const reply2Response = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: reply2Body.toString()
      }
    );
    
    const reply2Data = await reply2Response.json();
    console.log('Reply 2 response:', reply2Data);
    
    results.push({
      approach: 'with reply_control',
      success: reply2Response.ok,
      response: reply2Data,
      status: reply2Response.status
    });
    
    // Approach 3: Try URL parameter instead of body
    console.log('\n=== Approach 3: reply_to_id in URL ===');
    const reply3Body = new URLSearchParams();
    reply3Body.append('media_type', 'TEXT');
    reply3Body.append('text', 'Reply Approach 3 - reply_to_id in URL');
    reply3Body.append('access_token', accessToken);
    
    const reply3Url = `https://graph.threads.net/v1.0/${threadsUserId}/threads?reply_to_id=${starterPostId}`;
    
    const reply3Response = await fetch(reply3Url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: reply3Body.toString()
    });
    
    const reply3Data = await reply3Response.json();
    console.log('Reply 3 response:', reply3Data);
    
    results.push({
      approach: 'reply_to_id in URL',
      success: reply3Response.ok,
      response: reply3Data,
      status: reply3Response.status
    });
    
    // Find if any approach succeeded
    const successfulApproach = results.find(r => r.success);
    
    if (successfulApproach && successfulApproach.response.id) {
      // Try to publish the successful reply
      const publishReplyBody = new URLSearchParams();
      publishReplyBody.append('creation_id', successfulApproach.response.id);
      publishReplyBody.append('access_token', accessToken);
      
      const publishReplyResponse = await fetch(
        `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: publishReplyBody.toString()
        }
      );
      
      const publishReplyData = await publishReplyResponse.json();
      
      return NextResponse.json({
        success: true,
        message: `Thread created using ${successfulApproach.approach}!`,
        starterPostId,
        replyPostId: publishReplyData.id || null,
        workingApproach: successfulApproach.approach,
        allResults: results
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'All approaches failed',
      starterPostId,
      results,
      analysis: {
        hasPermissionError: results.some(r => 
          r.response.error?.message?.toLowerCase().includes('permission')),
        hasReplyToIdError: results.some(r => 
          r.response.error?.message?.includes('reply_to_id')),
        errorCodes: results.map(r => r.response.error?.code).filter(Boolean),
        errorTypes: results.map(r => r.response.error?.type).filter(Boolean)
      }
    });
    
  } catch (error) {
    console.error('Debug test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 });
  }
}