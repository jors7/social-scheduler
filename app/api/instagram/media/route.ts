import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InstagramClient } from '@/lib/instagram/client';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get Instagram account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('is_active', true);
    
    // If specific account requested, get that one
    if (accountId) {
      query = query.eq('id', accountId);
    }
    
    const { data: accounts, error: accountError } = await query;

    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Instagram account not connected' },
        { status: 404 }
      );
    }

    // Explicitly select the account
    const account = accountId
      ? accounts.find(acc => acc.id === accountId) || accounts[0]
      : accounts[0];

    if (!account) {
      return NextResponse.json(
        { error: 'Selected Instagram account not found' },
        { status: 404 }
      );
    }

    console.log(`[Instagram Media API] Using account: ${account.username || account.platform_user_id} (ID: ${account.id})`);

    // Initialize Instagram client
    const client = new InstagramClient({
      accessToken: account.access_token,
      userID: account.platform_user_id,
      appSecret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET,
    });

    // Fetch media from Instagram
    const mediaResponse = await client.getMedia(limit);

    // Fetch account info including follower count
    let accountInfo = null;
    try {
      accountInfo = await client.getAccountInfo();
    } catch (error) {
      console.error('Failed to fetch account info:', error);
    }

    // Return media with account info
    return NextResponse.json({
      success: true,
      media: mediaResponse.data || [],
      paging: mediaResponse.paging,
      account: {
        id: account.id,
        username: account.username,
        platform_user_id: account.platform_user_id,
        followers_count: accountInfo?.followers_count || 0,
        follows_count: accountInfo?.follows_count || 0,
        media_count: accountInfo?.media_count || 0,
        account_type: accountInfo?.account_type || 'UNKNOWN'
      }
    });

  } catch (error) {
    console.error('Instagram media fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Instagram media' },
      { status: 500 }
    );
  }
}