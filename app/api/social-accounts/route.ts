import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all social accounts for the user
    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching social accounts:', error);
      return NextResponse.json({ error: 'Failed to fetch social accounts' }, { status: 500 });
    }

    // Filter out sensitive data
    const sanitizedAccounts = (accounts || []).map(account => ({
      id: account.id,
      platform: account.platform,
      username: account.username,
      platform_user_id: account.platform_user_id,
      profile_image_url: account.profile_image_url,
      is_active: account.is_active,
      created_at: account.created_at,
      expires_at: account.expires_at,
      // Don't send tokens to the client
    }));

    return NextResponse.json(sanitizedAccounts);
  } catch (error) {
    console.error('Social accounts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}