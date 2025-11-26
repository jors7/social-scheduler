// =====================================================
// AFFILIATE STATUS CHANGE API
// =====================================================
// Handles suspension and reactivation of affiliates

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { suspendAffiliate, reactivateAffiliate } from '@/lib/affiliate/service';
import { isAdminEmail, checkAdminByUserId } from '@/lib/auth/admin';
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/admin/audit';

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// =====================================================
// POST /api/admin/affiliates/status
// =====================================================
// Change affiliate status (suspend or reactivate)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { affiliate_id, action, reason } = body;

    console.log('=== Affiliate Status Change API ===');
    console.log('affiliate_id:', affiliate_id);
    console.log('action:', action);
    console.log('reason:', reason);

    // Validate required fields
    if (!affiliate_id || !action) {
      console.log('❌ Validation failed: missing required fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields: affiliate_id, action' },
        { status: 400 }
      );
    }

    // Validate action
    if (action !== 'suspend' && action !== 'reactivate') {
      console.log('❌ Validation failed: invalid action');
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "suspend" or "reactivate"' },
        { status: 400 }
      );
    }

    // Verify admin authentication
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
      console.log('❌ User not authenticated');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✓ User authenticated:', user.id);

    // Verify user is an admin
    const supabaseAdmin = getServiceClient();
    const isAdmin = isAdminEmail(user.email) || await checkAdminByUserId(user.id, supabaseAdmin);

    if (!isAdmin) {
      console.log('❌ User is not an admin');
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    console.log('✓ Admin access verified');

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
