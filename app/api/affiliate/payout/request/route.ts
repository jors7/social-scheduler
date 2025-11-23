// =====================================================
// AFFILIATE PAYOUT REQUEST API
// =====================================================
// Allows affiliates to request payouts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { amount } = await request.json();

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getServiceClient();

    // Get affiliate data
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (affiliateError || !affiliate) {
      return NextResponse.json(
        { success: false, error: 'Affiliate not found or not active' },
        { status: 404 }
      );
    }

    // Validate amount
    const minPayout = parseFloat(process.env.AFFILIATE_MIN_PAYOUT_AMOUNT || '50');
    if (amount < minPayout) {
      return NextResponse.json(
        { success: false, error: `Minimum payout is $${minPayout}` },
        { status: 400 }
      );
    }

    if (amount > affiliate.pending_balance) {
      return NextResponse.json(
        { success: false, error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Check for pending payouts (limit to one at a time)
    const { data: pendingPayouts } = await supabaseAdmin
      .from('affiliate_payouts')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'pending');

    if (pendingPayouts && pendingPayouts.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending payout request' },
        { status: 400 }
      );
    }

    // Create payout request
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('affiliate_payouts')
      .insert({
        affiliate_id: affiliate.id,
        amount: amount,
        payout_method: affiliate.payout_method,
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (payoutError) {
      console.error('Error creating payout request:', payoutError);
      return NextResponse.json(
        { success: false, error: 'Failed to create payout request' },
        { status: 500 }
      );
    }

    // Queue notification email to admin
    try {
      const adminEmail = process.env.EMAIL_REPLY_TO || 'support@socialcal.app';

      await supabaseAdmin.from('pending_emails').insert({
        user_id: affiliate.user_id,
        email_to: adminEmail,
        email_type: 'affiliate_payout_requested',
        subject: `Payout Request from ${affiliate.referral_code} - $${amount}`,
        template_data: {
          affiliate_id: affiliate.id,
          referral_code: affiliate.referral_code,
          amount: amount,
          payout_id: payout.id,
          paypal_email: affiliate.paypal_email,
        },
      });
    } catch (emailError) {
      console.error('Error queuing payout notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Payout requested successfully',
      payout_id: payout.id,
    });

  } catch (error) {
    console.error('Error in payout request:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
