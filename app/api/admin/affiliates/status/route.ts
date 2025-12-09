// =====================================================
// AFFILIATE STATUS CHANGE API
// =====================================================
// Handles suspension and reactivation of affiliates

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { suspendAffiliate, reactivateAffiliate } from '@/lib/affiliate/service';
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/admin/audit';

// =====================================================
// POST /api/admin/affiliates/status
// =====================================================
// Change affiliate status (suspend or reactivate)

export async function POST(request: NextRequest) {
  // Check admin authorization
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json();
    const { affiliate_id, action, reason } = body;

    // Validate required fields
    if (!affiliate_id || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: affiliate_id, action' },
        { status: 400 }
      );
    }

    // Validate action
    if (action !== 'suspend' && action !== 'reactivate') {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "suspend" or "reactivate"' },
        { status: 400 }
      );
    }

    // Get current user for audit logging
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Perform the action
    let affiliate;
    if (action === 'suspend') {
      console.log('🔄 Calling suspendAffiliate...');
      affiliate = await suspendAffiliate(affiliate_id, reason);
      console.log('✓ Affiliate suspended:', affiliate);
    } else {
      console.log('🔄 Calling reactivateAffiliate...');
      affiliate = await reactivateAffiliate(affiliate_id);
      console.log('✓ Affiliate reactivated:', affiliate);
    }

    // Log audit trail
    await logAdminAction(
      user.id,
      action === 'suspend' ? ADMIN_ACTIONS.AFFILIATE_SUSPENDED : ADMIN_ACTIONS.AFFILIATE_REACTIVATED,
      'affiliate',
      affiliate_id,
      {
        reason: reason || null,
        new_status: action === 'suspend' ? 'suspended' : 'active',
      }
    );

    return NextResponse.json({
      success: true,
      message: `Affiliate ${action === 'suspend' ? 'suspended' : 'reactivated'} successfully`,
      affiliate,
    });
  } catch (error) {
    console.error('❌ Error changing affiliate status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change affiliate status',
      },
      { status: 500 }
    );
  }
}
