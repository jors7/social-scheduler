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

    // Check if user is authenticated and is admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Perform the action
    let affiliate;
    if (action === 'suspend') {
      affiliate = await suspendAffiliate(affiliate_id, reason);
    } else {
      affiliate = await reactivateAffiliate(affiliate_id);
    }

    return NextResponse.json({
      success: true,
      message: `Affiliate ${action === 'suspend' ? 'suspended' : 'reactivated'} successfully`,
      affiliate,
    });
  } catch (error) {
    console.error('Error changing affiliate status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change affiliate status',
      },
      { status: 500 }
    );
  }
}
