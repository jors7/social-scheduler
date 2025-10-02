import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get Instagram account from database
    const { data: accounts, error: dbError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('is_active', true);

    if (dbError || !accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'No Instagram account found' }, { status: 404 });
    }

    const account = accounts[0];
    const diagnostics: any = {
      database: {
        platform_user_id: account.platform_user_id,
        username: account.username,
        token_start: account.access_token?.substring(0, 10),
        token_end: account.access_token?.substring(account.access_token.length - 4),
        has_token: !!account.access_token,
        account_created: account.created_at,
        account_updated: account.updated_at
      },
      tests: {}
    };

    const accessToken = account.access_token;
    const userId = account.platform_user_id;

    // Test 1: Get profile via graph.instagram.com
    try {
      const profileUrl = `https://graph.instagram.com/${userId}?fields=id,username,account_type,media_count&access_token=${accessToken}`;
      const profileRes = await fetch(profileUrl);
      const profileData = await profileRes.json();

      diagnostics.tests.profile_instagram = {
        endpoint: 'graph.instagram.com',
        status: profileRes.status,
        success: profileRes.ok,
        data: profileData
      };
    } catch (error: any) {
      diagnostics.tests.profile_instagram = {
        error: error.message
      };
    }

    // Test 2: Get profile via graph.facebook.com
    try {
      const profileUrl = `https://graph.facebook.com/v20.0/${userId}?fields=id,username,account_type,media_count&access_token=${accessToken}`;
      const profileRes = await fetch(profileUrl);
      const profileData = await profileRes.json();

      diagnostics.tests.profile_facebook = {
        endpoint: 'graph.facebook.com',
        status: profileRes.status,
        success: profileRes.ok,
        data: profileData
      };
    } catch (error: any) {
      diagnostics.tests.profile_facebook = {
        error: error.message
      };
    }

    // Test 3: Get media via graph.instagram.com
    try {
      const mediaUrl = `https://graph.instagram.com/${userId}/media?fields=id,caption,media_type&limit=5&access_token=${accessToken}`;
      const mediaRes = await fetch(mediaUrl);
      const mediaData = await mediaRes.json();

      diagnostics.tests.media_instagram = {
        endpoint: 'graph.instagram.com',
        status: mediaRes.status,
        success: mediaRes.ok,
        data: mediaData,
        media_count: mediaData.data?.length || 0
      };
    } catch (error: any) {
      diagnostics.tests.media_instagram = {
        error: error.message
      };
    }

    // Test 4: Get media via graph.facebook.com
    try {
      const mediaUrl = `https://graph.facebook.com/v20.0/${userId}/media?fields=id,caption,media_type&limit=5&access_token=${accessToken}`;
      const mediaRes = await fetch(mediaUrl);
      const mediaData = await mediaRes.json();

      diagnostics.tests.media_facebook = {
        endpoint: 'graph.facebook.com',
        status: mediaRes.status,
        success: mediaRes.ok,
        data: mediaData,
        media_count: mediaData.data?.length || 0
      };
    } catch (error: any) {
      diagnostics.tests.media_facebook = {
        error: error.message
      };
    }

    // Test 5: Try creating a test container (doesn't publish)
    try {
      const testImageUrl = 'https://via.placeholder.com/150';
      const containerUrl = `https://graph.instagram.com/v20.0/${userId}/media`;
      const params = new URLSearchParams({
        image_url: testImageUrl,
        caption: 'Test',
        access_token: accessToken
      });

      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const containerData = await containerRes.json();

      diagnostics.tests.create_container_instagram = {
        endpoint: 'graph.instagram.com',
        status: containerRes.status,
        success: containerRes.ok,
        data: containerData
      };
    } catch (error: any) {
      diagnostics.tests.create_container_instagram = {
        error: error.message
      };
    }

    // Test 6: Try creating container via graph.facebook.com
    try {
      const testImageUrl = 'https://via.placeholder.com/150';
      const containerUrl = `https://graph.facebook.com/v20.0/${userId}/media`;
      const params = new URLSearchParams({
        image_url: testImageUrl,
        caption: 'Test',
        access_token: accessToken
      });

      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const containerData = await containerRes.json();

      diagnostics.tests.create_container_facebook = {
        endpoint: 'graph.facebook.com',
        status: containerRes.status,
        success: containerRes.ok,
        data: containerData
      };
    } catch (error: any) {
      diagnostics.tests.create_container_facebook = {
        error: error.message
      };
    }

    // Test 7: Check token debug info
    try {
      const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
      const debugRes = await fetch(debugUrl);
      const debugData = await debugRes.json();

      diagnostics.tests.token_debug = {
        status: debugRes.status,
        success: debugRes.ok,
        data: debugData
      };
    } catch (error: any) {
      diagnostics.tests.token_debug = {
        error: error.message
      };
    }

    return NextResponse.json(diagnostics, { status: 200 });

  } catch (error: any) {
    console.error('Diagnostic error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
