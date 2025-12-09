import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/auth';

/**
 * One-time admin endpoint to fix duplicate Instagram accounts
 * This deactivates all Instagram accounts except the most recently updated one
 */
export async function POST(request: NextRequest) {
  // Check admin authorization
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const supabase = await createClient();

    // Get current user for the query
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all Instagram accounts for this user
    const { data: accounts, error: fetchError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .order('updated_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching Instagram accounts:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        message: 'No Instagram accounts found',
        accounts: []
      });
    }

    console.log(`Found ${accounts.length} Instagram accounts for user ${user.id}`);

    // Keep the most recently updated account active, deactivate all others
    const mostRecentAccount = accounts[0];
    const accountsToDeactivate = accounts.slice(1);

    // Deactivate old accounts
    if (accountsToDeactivate.length > 0) {
      const idsToDeactivate = accountsToDeactivate.map(acc => acc.id);

      const { error: updateError } = await supabase
        .from('social_accounts')
        .update({ is_active: false })
        .in('id', idsToDeactivate);

      if (updateError) {
        console.error('Error deactivating accounts:', updateError);
        return NextResponse.json({ error: 'Failed to deactivate accounts' }, { status: 500 });
      }

      console.log(`Deactivated ${accountsToDeactivate.length} old Instagram accounts`);
    }

    // Ensure the most recent account is active
    const { error: activateError } = await supabase
      .from('social_accounts')
      .update({
        is_active: true
      })
      .eq('id', mostRecentAccount.id);

    if (activateError) {
      console.error('Error activating recent account:', activateError);
      return NextResponse.json({ error: 'Failed to activate account' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Fixed Instagram accounts. Kept account ${mostRecentAccount.username || mostRecentAccount.id} active, deactivated ${accountsToDeactivate.length} old accounts.`,
      activeAccount: {
        id: mostRecentAccount.id,
        username: mostRecentAccount.username,
        platform_user_id: mostRecentAccount.platform_user_id,
        updated_at: mostRecentAccount.updated_at
      },
      deactivatedAccounts: accountsToDeactivate.map(acc => ({
        id: acc.id,
        username: acc.username,
        platform_user_id: acc.platform_user_id,
        updated_at: acc.updated_at
      }))
    });

  } catch (error) {
    console.error('Error fixing Instagram accounts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
