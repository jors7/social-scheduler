// =====================================================
// AFFILIATE SERVICE
// =====================================================
// Core business logic for affiliate program operations
// Server-side only - uses service role for privileged operations

import { createClient } from '@supabase/supabase-js';
import type {
  Affiliate,
  AffiliateApplication,
  AffiliateStats,
  AffiliateConversion,
  AffiliatePayout,
  ConversionWithDetails,
  AffiliateLink,
} from '@/types/affiliate';

// =====================================================
// SUPABASE CLIENT (Service Role)
// =====================================================

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

// =====================================================
// AFFILIATE MANAGEMENT
// =====================================================

/**
 * Create a new affiliate profile after application approval
 */
export async function createAffiliate(
  userId: string,
  firstName: string,
  lastName: string,
  paypalEmail: string,
  commissionRate: number = 30
): Promise<Affiliate> {
  const supabase = getServiceClient();

  // Generate unique referral code
  const referralCode = await generateUniqueReferralCode(firstName, lastName);

  const { data, error } = await supabase
    .from('affiliates')
    .insert({
      user_id: userId,
      status: 'active',
      commission_rate: commissionRate,
      referral_code: referralCode,
      payout_method: 'paypal',
      paypal_email: paypalEmail,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating affiliate:', error);
    throw new Error('Failed to create affiliate profile');
  }

  return data;
}

/**
 * Generate a unique referral code
 */
async function generateUniqueReferralCode(
  firstName: string,
  lastName: string
): Promise<string> {
  const supabase = getServiceClient();

  // Create base code from first name (4 chars) + random number
  const baseCode = firstName.substring(0, 4).toUpperCase() + Math.floor(Math.random() * 9000 + 1000);

  let code = baseCode;
  let counter = 0;

  // Check if code exists, if so add counter
  while (true) {
    const { data } = await supabase
      .from('affiliates')
      .select('id')
      .eq('referral_code', code)
      .single();

    if (!data) break; // Code is unique

    counter++;
    code = baseCode + counter;
  }

  return code;
}

/**
 * Get affiliate by user ID
 */
export async function getAffiliateByUserId(userId: string): Promise<Affiliate | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Get affiliate by referral code
 */
export async function getAffiliateByReferralCode(
  referralCode: string
): Promise<Affiliate | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('referral_code', referralCode)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Update affiliate profile
 */
export async function updateAffiliate(
  affiliateId: string,
  updates: Partial<Affiliate>
): Promise<Affiliate> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('affiliates')
    .update(updates)
    .eq('id', affiliateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating affiliate:', error);
    throw new Error('Failed to update affiliate');
  }

  return data;
}

/**
 * Suspend an affiliate
 */
export async function suspendAffiliate(
  affiliateId: string,
  reason?: string
): Promise<Affiliate> {
  console.log('🔄 suspendAffiliate called with:', { affiliateId, reason });

  const supabase = getServiceClient();

  const updates: any = {
    status: 'suspended',
    updated_at: new Date().toISOString(),
  };

  // Optionally store suspension reason in metadata
  if (reason) {
    console.log('📝 Fetching current metadata...');
    const { data: current, error: fetchError } = await supabase
      .from('affiliates')
      .select('metadata')
      .eq('id', affiliateId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching metadata:', fetchError);
    }

    updates.metadata = {
      ...(current?.metadata || {}),
      suspension_reason: reason,
      suspended_at: new Date().toISOString(),
    };
    console.log('📝 Metadata to save:', updates.metadata);
  }

  console.log('💾 Attempting to update affiliate with:', updates);

  const { data, error } = await supabase
    .from('affiliates')
    .update(updates)
    .eq('id', affiliateId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error suspending affiliate:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to suspend affiliate: ${error.message || JSON.stringify(error)}`);
  }

  console.log('✅ Affiliate suspended successfully:', data);
  return data;
}

/**
 * Reactivate a suspended affiliate
 */
export async function reactivateAffiliate(
  affiliateId: string
): Promise<Affiliate> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('affiliates')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', affiliateId)
    .select()
    .single();

  if (error) {
    console.error('Error reactivating affiliate:', error);
    throw new Error('Failed to reactivate affiliate');
  }

  return data;
}

// =====================================================
// APPLICATION MANAGEMENT
// =====================================================

/**
 * Submit affiliate application
 */
export async function submitApplication(
  application: Omit<AffiliateApplication, 'id' | 'status' | 'created_at'>
): Promise<AffiliateApplication> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('affiliate_applications')
    .insert({
      ...application,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting application:', error);
    throw new Error('Failed to submit application');
  }

  return data;
}

/**
 * Approve affiliate application
 */
export async function approveApplication(
  applicationId: string,
  reviewedBy: string
): Promise<{ affiliate: Affiliate; application: AffiliateApplication }> {
  const supabase = getServiceClient();

  // Get application details
  const { data: application, error: appError } = await supabase
    .from('affiliate_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (appError || !application) {
    throw new Error('Application not found');
  }

  // Update application status
  const { error: updateError } = await supabase
    .from('affiliate_applications')
    .update({
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (updateError) {
    throw new Error('Failed to update application status');
  }

  // Create affiliate profile
  const affiliate = await createAffiliate(
    application.user_id,
    application.first_name,
    application.last_name,
    application.email, // Use email as PayPal email for now
    30 // Default commission rate
  );

  // Update user metadata to add affiliate type
  await updateUserMetadata(application.user_id, 'affiliate');

  return { affiliate, application: { ...application, status: 'approved' } };
}

/**
 * Reject affiliate application
 */
export async function rejectApplication(
  applicationId: string,
  reviewedBy: string,
  rejectionReason: string
): Promise<AffiliateApplication> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('affiliate_applications')
    .update({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    })
    .eq('id', applicationId)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to reject application');
  }

  return data;
}

/**
 * Get all pending applications
 */
export async function getPendingApplications(): Promise<AffiliateApplication[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('affiliate_applications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending applications:', error);
    return [];
  }

  return data || [];
}

// =====================================================
// USER METADATA MANAGEMENT
// =====================================================

/**
 * Update user metadata to set user_type
 */
async function updateUserMetadata(
  userId: string,
  userType: 'member' | 'affiliate' | 'both'
): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { user_type: userType },
  });

  if (error) {
    console.error('Error updating user metadata:', error);
    throw new Error('Failed to update user type');
  }
}

// =====================================================
// COMMISSION CALCULATION
// =====================================================

/**
 * Calculate commission for a payment
 */
export function calculateCommission(
  paymentAmount: number,
  commissionRate: number
): number {
  return parseFloat((paymentAmount * (commissionRate / 100)).toFixed(2));
}

/**
 * Create a conversion record when a referred customer pays
 */
export async function createConversion(
  affiliateId: string,
  customerUserId: string,
  subscriptionId: string,
  paymentAmount: number,
  commissionRate: number,
  stripeInvoiceId: string,
  clickId?: string
): Promise<AffiliateConversion> {
  const supabase = getServiceClient();

  const commissionAmount = calculateCommission(paymentAmount, commissionRate);

  // Create conversion record
  const { data: conversion, error: conversionError } = await supabase
    .from('affiliate_conversions')
    .insert({
      affiliate_id: affiliateId,
      customer_user_id: customerUserId,
      subscription_id: subscriptionId,
      commission_amount: commissionAmount,
      status: 'pending',
      payment_date: new Date().toISOString(),
      stripe_invoice_id: stripeInvoiceId,
      click_id: clickId,
    })
    .select()
    .single();

  if (conversionError) {
    console.error('Error creating conversion:', conversionError);
    throw new Error('Failed to create conversion record');
  }

  // Update affiliate earnings
  await updateAffiliateEarnings(affiliateId, commissionAmount);

  // Mark click as converted if click_id provided
  if (clickId) {
    await supabase
      .from('affiliate_clicks')
      .update({ converted: true })
      .eq('id', clickId);
  }

  return conversion;
}

/**
 * Update affiliate earnings after a commission
 */
async function updateAffiliateEarnings(
  affiliateId: string,
  commissionAmount: number
): Promise<void> {
  const supabase = getServiceClient();

  // Increment total_earnings and pending_balance
  const { error } = await supabase.rpc('increment_affiliate_earnings', {
    p_affiliate_id: affiliateId,
    p_amount: commissionAmount,
  });

  // If RPC doesn't exist, fallback to manual update
  if (error) {
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('total_earnings, pending_balance')
      .eq('id', affiliateId)
      .single();

    if (affiliate) {
      await supabase
        .from('affiliates')
        .update({
          total_earnings: affiliate.total_earnings + commissionAmount,
          pending_balance: affiliate.pending_balance + commissionAmount,
        })
        .eq('id', affiliateId);
    }
  }
}

/**
 * Handle refund - reverse commission
 */
export async function handleRefund(
  subscriptionId: string,
  stripeInvoiceId: string
): Promise<void> {
  const supabase = getServiceClient();

  // Find the conversion
  const { data: conversion } = await supabase
    .from('affiliate_conversions')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .eq('stripe_invoice_id', stripeInvoiceId)
    .single();

  if (!conversion) return;

  // Mark conversion as refunded
  await supabase
    .from('affiliate_conversions')
    .update({ status: 'refunded' })
    .eq('id', conversion.id);

  // Deduct from affiliate pending balance
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('pending_balance')
    .eq('id', conversion.affiliate_id)
    .single();

  if (affiliate) {
    await supabase
      .from('affiliates')
      .update({
        pending_balance: Math.max(0, affiliate.pending_balance - conversion.commission_amount),
      })
      .eq('id', conversion.affiliate_id);
  }
}

// =====================================================
// STATISTICS
// =====================================================

/**
 * Get affiliate statistics
 */
export async function getAffiliateStats(affiliateId: string): Promise<AffiliateStats> {
  const supabase = getServiceClient();

  // Get affiliate data
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('*')
    .eq('id', affiliateId)
    .single();

  if (!affiliate) {
    throw new Error('Affiliate not found');
  }

  // Get total conversions
  const { count: conversionsCount } = await supabase
    .from('affiliate_conversions')
    .select('*', { count: 'exact', head: true })
    .eq('affiliate_id', affiliateId)
    .neq('status', 'refunded');

  // Get total clicks
  const { count: clicksCount } = await supabase
    .from('affiliate_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('affiliate_id', affiliateId);

  // Get active customers (customers with active subscriptions)
  const { count: activeCustomers } = await supabase
    .from('affiliate_conversions')
    .select('customer_user_id', { count: 'exact', head: true })
    .eq('affiliate_id', affiliateId)
    .neq('status', 'refunded');

  // Calculate monthly recurring commission
  const { data: activeConversions } = await supabase
    .from('affiliate_conversions')
    .select('commission_amount')
    .eq('affiliate_id', affiliateId)
    .eq('status', 'pending');

  const monthlyRecurring = activeConversions?.reduce(
    (sum, conv) => sum + conv.commission_amount,
    0
  ) || 0;

  const conversionRate = clicksCount && clicksCount > 0
    ? ((conversionsCount || 0) / clicksCount) * 100
    : 0;

  return {
    total_earnings: affiliate.total_earnings,
    pending_balance: affiliate.pending_balance,
    paid_balance: affiliate.paid_balance,
    total_conversions: conversionsCount || 0,
    total_clicks: clicksCount || 0,
    conversion_rate: parseFloat(conversionRate.toFixed(2)),
    active_customers: activeCustomers || 0,
    monthly_recurring_commission: monthlyRecurring,
  };
}

/**
 * Get conversions for an affiliate
 */
export async function getAffiliateConversions(
  affiliateId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ConversionWithDetails[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('affiliate_conversions')
    .select(`
      *,
      customer:customer_user_id (
        email,
        full_name
      ),
      subscription:subscription_id (
        plan_id
      )
    `)
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching conversions:', error);
    return [];
  }

  return data || [];
}

// =====================================================
// PAYOUT MANAGEMENT
// =====================================================

/**
 * Request a payout
 */
export async function requestPayout(
  affiliateId: string,
  amount: number
): Promise<AffiliatePayout> {
  const supabase = getServiceClient();

  // Verify affiliate has enough balance
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('pending_balance, payout_method, paypal_email')
    .eq('id', affiliateId)
    .single();

  if (!affiliate) {
    throw new Error('Affiliate not found');
  }

  if (affiliate.pending_balance < amount) {
    throw new Error('Insufficient balance');
  }

  const minPayout = parseFloat(process.env.AFFILIATE_MIN_PAYOUT_AMOUNT || '50');
  if (amount < minPayout) {
    throw new Error(`Minimum payout amount is $${minPayout}`);
  }

  // Create payout request
  const { data: payout, error } = await supabase
    .from('affiliate_payouts')
    .insert({
      affiliate_id: affiliateId,
      amount,
      payout_method: affiliate.payout_method,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create payout request');
  }

  return payout;
}

/**
 * Get pending payouts (admin)
 */
export async function getPendingPayouts(): Promise<AffiliatePayout[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('affiliate_payouts')
    .select(`
      *,
      affiliate:affiliate_id (
        referral_code,
        paypal_email,
        user_id
      )
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending payouts:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark payout as completed
 */
export async function completePayout(
  payoutId: string,
  paypalBatchId?: string,
  paypalTransactionId?: string
): Promise<void> {
  const supabase = getServiceClient();

  // Get payout details
  const { data: payout } = await supabase
    .from('affiliate_payouts')
    .select('*')
    .eq('id', payoutId)
    .single();

  if (!payout) {
    throw new Error('Payout not found');
  }

  // Update payout status
  await supabase
    .from('affiliate_payouts')
    .update({
      status: 'completed',
      processed_at: new Date().toISOString(),
      paypal_batch_id: paypalBatchId,
      paypal_transaction_id: paypalTransactionId,
    })
    .eq('id', payoutId);

  // Update affiliate balances
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('pending_balance, paid_balance')
    .eq('id', payout.affiliate_id)
    .single();

  if (affiliate) {
    await supabase
      .from('affiliates')
      .update({
        pending_balance: affiliate.pending_balance - payout.amount,
        paid_balance: affiliate.paid_balance + payout.amount,
      })
      .eq('id', payout.affiliate_id);
  }

  // Mark conversions as paid
  await supabase
    .from('affiliate_conversions')
    .update({ status: 'paid' })
    .eq('affiliate_id', payout.affiliate_id)
    .eq('status', 'pending');
}

// =====================================================
// LINK MANAGEMENT
// =====================================================

/**
 * Create a new tracking link
 */
export async function createAffiliateLink(
  affiliateId: string,
  name?: string,
  utmParams?: any
): Promise<AffiliateLink> {
  const supabase = getServiceClient();

  // Generate unique slug
  const slug = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('affiliate_links')
    .insert({
      affiliate_id: affiliateId,
      slug,
      name,
      utm_params: utmParams || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create tracking link');
  }

  return data;
}

// =====================================================
// EXPORTS
// =====================================================

export const affiliateService = {
  // Affiliate management
  createAffiliate,
  getAffiliateByUserId,
  getAffiliateByReferralCode,
  updateAffiliate,

  // Application management
  submitApplication,
  approveApplication,
  rejectApplication,
  getPendingApplications,

  // Commission calculation
  calculateCommission,
  createConversion,
  handleRefund,

  // Statistics
  getAffiliateStats,
  getAffiliateConversions,

  // Payout management
  requestPayout,
  getPendingPayouts,
  completePayout,

  // Link management
  createAffiliateLink,
};

export default affiliateService;
