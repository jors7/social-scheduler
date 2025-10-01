import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API endpoint to safely deactivate problematic social media accounts
 * This is safer than direct SQL updates and respects RLS policies
 * Updated: 2025-10-01
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, action } = body;

    if (!accountId || !action) {
      return NextResponse.json(
        { error: 'accountId and action are required' },
        { status: 400 }
      );
    }

    // Verify the account belongs to the user
    const { data: account, error: fetchError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !account) {
      return NextResponse.json(
        { error: 'Account not found or does not belong to you' },
        { status: 404 }
      );
    }

    let result;

    if (action === 'deactivate') {
      // Deactivate the account
      const { data, error } = await supabase
        .from('social_accounts')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('user_id', user.id)
        .select();

      if (error) {
        throw error;
      }

      result = {
        success: true,
        message: `Account ${account.username || account.platform} has been deactivated`,
        account: data?.[0]
      };
    } else if (action === 'activate') {
      // Reactivate the account
      const { data, error } = await supabase
        .from('social_accounts')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('user_id', user.id)
        .select();

      if (error) {
        throw error;
      }

      result = {
        success: true,
        message: `Account ${account.username || account.platform} has been reactivated`,
        account: data?.[0]
      };
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "deactivate" or "activate"' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Account cleanup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to list all accounts with problematic states
 */
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
      .select('id, platform, username, platform_user_id, is_active, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Identify potentially problematic accounts
    const accountsByPlatform = (accounts || []).reduce((acc: any, account: any) => {
      if (!acc[account.platform]) {
        acc[account.platform] = [];
      }
      acc[account.platform].push(account);
      return acc;
    }, {});

    const problematicAccounts = [];

    // Find platforms with multiple active accounts
    for (const [platform, platformAccounts] of Object.entries(accountsByPlatform)) {
      const activeAccounts = (platformAccounts as any[]).filter(a => a.is_active);

      if (activeAccounts.length > 1) {
        // Multiple active accounts for the same platform - keep the newest
        const sorted = activeAccounts.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // All but the first (newest) are problematic
        problematicAccounts.push(...sorted.slice(1).map(acc => ({
          ...acc,
          issue: 'duplicate_active_account',
          recommendation: 'deactivate'
        })));
      }
    }

    return NextResponse.json({
      allAccounts: accounts,
      problematicAccounts,
      accountsByPlatform
    });

  } catch (error) {
    console.error('Account cleanup GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
