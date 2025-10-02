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

    // Get ALL Instagram accounts for this user (including inactive ones)
    const { data: allAccounts, error: allError } = await supabase
      .from('social_accounts')
      .select('id, platform_user_id, username, is_active, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .order('created_at', { ascending: false });

    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    // Get only active Instagram accounts
    const { data: activeAccounts, error: activeError } = await supabase
      .from('social_accounts')
      .select('id, platform_user_id, username, is_active, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (activeError) {
      return NextResponse.json({ error: activeError.message }, { status: 500 });
    }

    return NextResponse.json({
      user_id: user.id,
      total_instagram_accounts: allAccounts?.length || 0,
      active_instagram_accounts: activeAccounts?.length || 0,
      all_accounts: allAccounts || [],
      active_accounts: activeAccounts || []
    }, { status: 200 });

  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
