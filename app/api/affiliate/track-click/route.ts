import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  getAffiliateIdFromCode,
  collectTrackingData,
} from '@/lib/affiliate/tracking';

// =====================================================
// TRACK AFFILIATE CLICK API ENDPOINT
// =====================================================
// Records a click when someone visits via a referral link
// Called by the landing page when it detects a referral cookie
//
// SECURITY NOTE: This endpoint uses the service role client because:
// - Click tracking must work for anonymous (unauthenticated) visitors
// - RLS policies on affiliate_clicks table require service role to insert
// - The endpoint is public but validated (requires valid referral code)
// - IP-based deduplication prevents abuse

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { referralCode } = body;

    // Validate input
    if (!referralCode || typeof referralCode !== 'string') {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase service client (bypasses RLS for anonymous click tracking)
    const supabase = createServiceClient();

    // Look up affiliate by referral code
    const affiliateId = await getAffiliateIdFromCode(referralCode, supabase);

    if (!affiliateId) {
      // Invalid or inactive referral code
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 404 }
      );
    }

    // Collect tracking data (IP, user agent, referrer)
    const trackingData = collectTrackingData(request, referralCode);

    // Check for duplicate click (same IP within 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: existingClick } = await supabase
      .from('affiliate_clicks')
      .select('id')
      .eq('affiliate_id', affiliateId)
      .eq('ip_hash', trackingData.ipHash)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .limit(1)
      .single();

    // If duplicate, return success but don't record again
    if (existingClick) {
      return NextResponse.json({
        success: true,
        message: 'Click already recorded (duplicate)',
        duplicate: true,
      });
    }

    // Insert click record
    const { data: clickRecord, error: insertError } = await supabase
      .from('affiliate_clicks')
      .insert({
        affiliate_id: affiliateId,
        referrer_url: trackingData.referrerUrl,
        user_agent: trackingData.userAgent,
        ip_hash: trackingData.ipHash,
        converted: false, // Will be updated later when user subscribes
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting affiliate click:', insertError);
      return NextResponse.json(
        { error: 'Failed to record click' },
        { status: 500 }
      );
    }

    // Success
    return NextResponse.json({
      success: true,
      message: 'Click recorded successfully',
      duplicate: false,
      clickId: clickRecord.id,
    });
  } catch (error) {
    console.error('Error in track-click API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
