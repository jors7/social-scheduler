// =====================================================
// ADMIN AFFILIATE PAYOUT PROCESSING API
// =====================================================
// Allows admins to process affiliate payouts via PayPal

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createBatchPayout } from '@/lib/paypal/service';

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check here
    // For now, any authenticated user can process payouts
    // In production, check user.user_metadata.role === 'admin'

    const { payout_ids, method } = await request.json();

    if (!payout_ids || !Array.isArray(payout_ids) || payout_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No payout IDs provided' },
        { status: 400 }
      );
    }

    if (method !== 'paypal') {
      return NextResponse.json(
        { success: false, error: 'Only PayPal payouts are currently supported' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getServiceClient();

    // Get all pending payouts with affiliate details
    const { data: payouts, error: payoutsError} = await supabaseAdmin
      .from('affiliate_payouts')
      .select(`
        *,
        affiliates:affiliate_id (
          id,
          user_id,
          referral_code,
          paypal_email,
          pending_balance
        )
      `)
      .in('id', payout_ids)
      .eq('status', 'pending');

    if (payoutsError || !payouts || payouts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid pending payouts found' },
        { status: 404 }
      );
    }

    // Validate all payouts have PayPal emails
    const invalidPayouts = payouts.filter(
      (p: any) => !p.affiliates?.paypal_email
    );

    if (invalidPayouts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some affiliates do not have PayPal emails configured',
          invalid_count: invalidPayouts.length,
        },
        { status: 400 }
      );
    }

    // Prepare PayPal batch payout
    const paypalPayouts = payouts.map((payout: any) => ({
      affiliate_id: payout.affiliate_id,
      payout_id: payout.id,
      amount: parseFloat(payout.amount),
      paypal_email: payout.affiliates.paypal_email,
      affiliate_name: `${payout.affiliates.user_id}`, // Or use actual name if available
    }));

    // Send batch payout to PayPal
    let paypalResponse;
    try {
      paypalResponse = await createBatchPayout(paypalPayouts);
    } catch (paypalError: any) {
      console.error('PayPal payout error:', paypalError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process PayPal payout',
          details: paypalError.message,
        },
        { status: 500 }
      );
    }

    // Check if PayPal batch was created successfully
    if (!paypalResponse.batch_header || !paypalResponse.batch_header.payout_batch_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'PayPal payout failed - no batch ID returned',
        },
        { status: 500 }
      );
    }

    // Update payout records with PayPal batch ID
    const paypalBatchId = paypalResponse.batch_header.payout_batch_id;
    const { error: updateError } = await supabaseAdmin
      .from('affiliate_payouts')
      .update({
        status: 'processing',
        paypal_batch_id: paypalBatchId,
        processed_at: new Date().toISOString(),
      })
      .in('id', payout_ids);

    if (updateError) {
      console.error('Error updating payout records:', updateError);
      // Don't fail - PayPal was already charged
    }

    // Update affiliate balances (move from pending to paid)
    const balanceUpdates = payouts.map(async (payout: any) => {
      const { error: balanceError } = await supabaseAdmin
        .from('affiliates')
        .update({
          pending_balance: payout.affiliates.pending_balance - payout.amount,
          paid_balance: (payout.affiliates.paid_balance || 0) + payout.amount,
        })
        .eq('id', payout.affiliate_id);

      if (balanceError) {
        console.error(`Error updating balance for affiliate ${payout.affiliate_id}:`, balanceError);
      }

      // Queue payout confirmation email
      try {
        await supabaseAdmin.from('pending_emails').insert({
          user_id: payout.affiliates.user_id,
          email_to: payout.affiliates.paypal_email,
          email_type: 'affiliate_payout_processed',
          subject: `Your SocialCal Affiliate Payout of $${payout.amount} is Being Processed`,
          template_data: {
            amount: payout.amount,
            paypal_email: payout.affiliates.paypal_email,
            referral_code: payout.affiliates.referral_code,
            paypal_batch_id: paypalBatchId,
          },
        });
      } catch (emailError) {
        console.error('Error queuing payout email:', emailError);
        // Don't fail the request if email fails
      }
    });

    await Promise.all(balanceUpdates);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${payouts.length} payout(s) via PayPal`,
      batch_id: paypalBatchId,
      payout_count: payouts.length,
      total_amount: payouts.reduce((sum: number, p: any) => sum + p.amount, 0),
    });

  } catch (error) {
    console.error('Error processing payouts:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
