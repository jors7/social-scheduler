// =====================================================
// AFFILIATE STATUS CHANGE API
// =====================================================
// Handles suspension and reactivation of affiliates

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { suspendAffiliate, reactivateAffiliate } from '@/lib/affiliate/service';

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

    // Check if user is authenticated and is admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log('❌ User not authenticated');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✓ User authenticated:', user.id);

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      console.log('❌ User is not admin');
      return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    console.log('✓ User is admin');

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
