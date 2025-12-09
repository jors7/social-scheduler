// =====================================================
// PAYPAL PAYOUTS SERVICE
// =====================================================
// Service for handling PayPal payouts to affiliates
// Uses PayPal Payouts API v1

import type {
  PayPalAccessTokenResponse,
  PayPalPayoutRequest,
  PayPalPayoutResponse,
  PayPalPayoutStatus,
  PayPalPayoutItem,
} from '@/types/affiliate';
import { fetchWithTimeout, TIMEOUT } from '@/lib/utils/fetch-with-timeout';
import { createClient } from '@supabase/supabase-js';

// Supabase admin client for webhook handlers (bypasses RLS)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// =====================================================
// CONFIGURATION
// =====================================================

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' or 'live'

const PAYPAL_API_BASE_URL =
  PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// =====================================================
// AUTHENTICATION
// =====================================================

/**
 * Get PayPal OAuth 2.0 access token
 * Access tokens expire after 9 hours, so cache this if needed
 */
export async function getPayPalAccessToken(): Promise<string> {
  try {
    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetchWithTimeout(`${PAYPAL_API_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
      timeout: TIMEOUT.DEFAULT,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal auth failed: ${error}`);
    }

    const data: PayPalAccessTokenResponse = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    throw new Error('Failed to authenticate with PayPal');
  }
}

// =====================================================
// PAYOUTS
// =====================================================

/**
 * Create a batch payout to multiple affiliates
 * @param payouts Array of payout items
 * @returns PayPal batch payout response with batch_id
 */
export async function createBatchPayout(
  payouts: Array<{
    affiliate_id: string;
    payout_id: string;
    amount: number;
    paypal_email: string;
    affiliate_name: string;
  }>
): Promise<PayPalPayoutResponse> {
  try {
    const accessToken = await getPayPalAccessToken();

    // Generate unique batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare payout items
    const items: PayPalPayoutItem[] = payouts.map((payout) => ({
      recipient_type: 'EMAIL',
      amount: {
        value: payout.amount.toFixed(2),
        currency: 'USD',
      },
      note: `SocialCal Affiliate Commission - ${new Date().toLocaleDateString()}`,
      sender_item_id: payout.payout_id, // Use our payout_id for tracking
      receiver: payout.paypal_email,
    }));

    // Create payout request
    const payoutRequest: PayPalPayoutRequest = {
      sender_batch_header: {
        sender_batch_id: batchId,
        email_subject: 'You received a payment from SocialCal',
        email_message: 'You have received an affiliate commission payment. Thank you for promoting SocialCal!',
      },
      items,
    };

    const response = await fetchWithTimeout(`${PAYPAL_API_BASE_URL}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payoutRequest),
      timeout: TIMEOUT.LONG, // Payouts may take longer
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('PayPal payout error:', error);
      throw new Error(
        `PayPal payout failed: ${error.message || response.statusText}`
      );
    }

    const data: PayPalPayoutResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating PayPal batch payout:', error);
    throw error;
  }
}

/**
 * Create a single payout to one affiliate
 * @param payout Single payout details
 * @returns PayPal payout response
 */
export async function createSinglePayout(payout: {
  affiliate_id: string;
  payout_id: string;
  amount: number;
  paypal_email: string;
  affiliate_name: string;
}): Promise<PayPalPayoutResponse> {
  return createBatchPayout([payout]);
}

// =====================================================
// STATUS CHECKING
// =====================================================

/**
 * Get the status of a payout batch
 * @param batchId PayPal batch ID (payout_batch_id)
 * @returns Payout batch status with individual item statuses
 */
export async function getPayoutStatus(
  batchId: string
): Promise<PayPalPayoutStatus> {
  try {
    const accessToken = await getPayPalAccessToken();

    const response = await fetchWithTimeout(
      `${PAYPAL_API_BASE_URL}/v1/payments/payouts/${batchId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: TIMEOUT.DEFAULT,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get payout status: ${error}`);
    }

    const data: PayPalPayoutStatus = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting PayPal payout status:', error);
    throw error;
  }
}

/**
 * Get the status of a specific payout item within a batch
 * @param itemId PayPal payout item ID
 * @returns Individual payout item status
 */
export async function getPayoutItemStatus(itemId: string): Promise<any> {
  try {
    const accessToken = await getPayPalAccessToken();

    const response = await fetchWithTimeout(
      `${PAYPAL_API_BASE_URL}/v1/payments/payouts-item/${itemId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: TIMEOUT.DEFAULT,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get payout item status: ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting PayPal payout item status:', error);
    throw error;
  }
}

// =====================================================
// WEBHOOK HANDLING
// =====================================================

/**
 * Process PayPal webhook event
 * Common events:
 * - PAYMENT.PAYOUTS-ITEM.SUCCEEDED
 * - PAYMENT.PAYOUTS-ITEM.FAILED
 * - PAYMENT.PAYOUTS-ITEM.BLOCKED
 * - PAYMENT.PAYOUTS-ITEM.RETURNED
 * - PAYMENT.PAYOUTS-ITEM.UNCLAIMED
 */
export async function handlePayPalWebhook(event: any): Promise<void> {
  const eventType = event.event_type;
  const resource = event.resource;

  console.log('PayPal webhook received:', eventType);

  switch (eventType) {
    case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED':
      // Payout completed successfully
      await handlePayoutSuccess(resource);
      break;

    case 'PAYMENT.PAYOUTS-ITEM.FAILED':
      // Payout failed
      await handlePayoutFailure(resource);
      break;

    case 'PAYMENT.PAYOUTS-ITEM.BLOCKED':
      // Payout blocked (e.g., account issue)
      await handlePayoutBlocked(resource);
      break;

    case 'PAYMENT.PAYOUTS-ITEM.RETURNED':
      // Payout returned (e.g., invalid email)
      await handlePayoutReturned(resource);
      break;

    case 'PAYMENT.PAYOUTS-ITEM.UNCLAIMED':
      // Payout unclaimed (recipient hasn't accepted)
      await handlePayoutUnclaimed(resource);
      break;

    default:
      console.log('Unhandled PayPal webhook event:', eventType);
  }
}

async function handlePayoutSuccess(resource: any): Promise<void> {
  const payoutItemId = resource.payout_item_id;
  const transactionId = resource.transaction_id;
  const senderItemId = resource.payout_item?.sender_item_id; // Our payout_id

  console.log('Payout succeeded:', {
    payoutItemId,
    transactionId,
    senderItemId,
  });

  if (!senderItemId) {
    console.error('No sender_item_id in payout success webhook');
    return;
  }

  const supabase = getSupabaseAdmin();

  // Find the payout record by our payout_id (sender_item_id)
  const { data: payout, error: fetchError } = await supabase
    .from('affiliate_payouts')
    .select('id, affiliate_id, amount, status')
    .eq('id', senderItemId)
    .single();

  if (fetchError || !payout) {
    console.error('Payout not found:', senderItemId, fetchError);
    return;
  }

  // Skip if already processed
  if (payout.status === 'completed') {
    console.log('Payout already marked as completed:', senderItemId);
    return;
  }

  // Update payout status to completed
  const { error: updatePayoutError } = await supabase
    .from('affiliate_payouts')
    .update({
      status: 'completed',
      paypal_payout_item_id: payoutItemId,
      paypal_transaction_id: transactionId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', senderItemId);

  if (updatePayoutError) {
    console.error('Failed to update payout status:', updatePayoutError);
    return;
  }

  // Update affiliate's paid_balance (add) and pending_balance (subtract)
  const { error: updateAffiliateError } = await supabase.rpc('process_affiliate_payout_success', {
    p_affiliate_id: payout.affiliate_id,
    p_amount: payout.amount,
  });

  // If RPC doesn't exist, fall back to manual update
  if (updateAffiliateError) {
    console.log('RPC not available, using manual update');
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('pending_balance, paid_balance')
      .eq('id', payout.affiliate_id)
      .single();

    if (affiliate) {
      await supabase
        .from('affiliates')
        .update({
          pending_balance: Math.max(0, Number(affiliate.pending_balance) - Number(payout.amount)),
          paid_balance: Number(affiliate.paid_balance) + Number(payout.amount),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payout.affiliate_id);
    }
  }

  console.log('Payout success processed:', senderItemId);
}

async function handlePayoutFailure(resource: any): Promise<void> {
  const payoutItemId = resource.payout_item_id;
  const senderItemId = resource.payout_item?.sender_item_id;
  const errors = resource.errors;

  console.error('Payout failed:', {
    payoutItemId,
    senderItemId,
    errors,
  });

  if (!senderItemId) {
    console.error('No sender_item_id in payout failure webhook');
    return;
  }

  const supabase = getSupabaseAdmin();

  // Find the payout record
  const { data: payout, error: fetchError } = await supabase
    .from('affiliate_payouts')
    .select('id, affiliate_id, amount, status')
    .eq('id', senderItemId)
    .single();

  if (fetchError || !payout) {
    console.error('Payout not found:', senderItemId, fetchError);
    return;
  }

  // Skip if already processed
  if (payout.status === 'completed' || payout.status === 'failed') {
    console.log('Payout already processed:', senderItemId, payout.status);
    return;
  }

  // Format error message
  const failureReason = errors
    ? (Array.isArray(errors) ? errors.map((e: any) => e.message || e).join('; ') : String(errors))
    : 'Unknown error';

  // Update payout status to failed
  const { error: updatePayoutError } = await supabase
    .from('affiliate_payouts')
    .update({
      status: 'failed',
      paypal_payout_item_id: payoutItemId,
      failure_reason: failureReason,
      processed_at: new Date().toISOString(),
    })
    .eq('id', senderItemId);

  if (updatePayoutError) {
    console.error('Failed to update payout status:', updatePayoutError);
    return;
  }

  // Refund the amount back to pending_balance
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('pending_balance')
    .eq('id', payout.affiliate_id)
    .single();

  if (affiliate) {
    await supabase
      .from('affiliates')
      .update({
        pending_balance: Number(affiliate.pending_balance) + Number(payout.amount),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payout.affiliate_id);
  }

  console.log('Payout failure processed:', senderItemId);
}

async function handlePayoutBlocked(resource: any): Promise<void> {
  const payoutItemId = resource.payout_item_id;
  const senderItemId = resource.payout_item?.sender_item_id;

  console.error('Payout blocked:', {
    payoutItemId,
    senderItemId,
  });

  // Treat blocked same as failure with specific reason
  await handlePayoutFailureInternal(
    senderItemId,
    payoutItemId,
    'Account blocked or restricted by PayPal. Please contact support.'
  );
}

async function handlePayoutReturned(resource: any): Promise<void> {
  const payoutItemId = resource.payout_item_id;
  const senderItemId = resource.payout_item?.sender_item_id;

  console.error('Payout returned:', {
    payoutItemId,
    senderItemId,
  });

  // Treat returned same as failure with specific reason
  await handlePayoutFailureInternal(
    senderItemId,
    payoutItemId,
    'Payment returned. Please verify your PayPal email address is correct.'
  );
}

async function handlePayoutUnclaimed(resource: any): Promise<void> {
  const payoutItemId = resource.payout_item_id;
  const senderItemId = resource.payout_item?.sender_item_id;

  console.log('Payout unclaimed:', {
    payoutItemId,
    senderItemId,
  });

  if (!senderItemId) {
    console.error('No sender_item_id in payout unclaimed webhook');
    return;
  }

  const supabase = getSupabaseAdmin();

  // Update payout with unclaimed note but keep as processing
  // PayPal will send RETURNED event after 30 days if still unclaimed
  await supabase
    .from('affiliate_payouts')
    .update({
      status: 'processing',
      paypal_payout_item_id: payoutItemId,
      failure_reason: 'Payment unclaimed - recipient has not accepted the payment yet.',
    })
    .eq('id', senderItemId);

  console.log('Payout unclaimed processed:', senderItemId);
}

// Helper function for failure-type events (blocked, returned)
async function handlePayoutFailureInternal(
  senderItemId: string | undefined,
  payoutItemId: string,
  failureReason: string
): Promise<void> {
  if (!senderItemId) {
    console.error('No sender_item_id in payout webhook');
    return;
  }

  const supabase = getSupabaseAdmin();

  // Find the payout record
  const { data: payout, error: fetchError } = await supabase
    .from('affiliate_payouts')
    .select('id, affiliate_id, amount, status')
    .eq('id', senderItemId)
    .single();

  if (fetchError || !payout) {
    console.error('Payout not found:', senderItemId, fetchError);
    return;
  }

  // Skip if already processed
  if (payout.status === 'completed' || payout.status === 'failed') {
    console.log('Payout already processed:', senderItemId, payout.status);
    return;
  }

  // Update payout status to failed
  await supabase
    .from('affiliate_payouts')
    .update({
      status: 'failed',
      paypal_payout_item_id: payoutItemId,
      failure_reason: failureReason,
      processed_at: new Date().toISOString(),
    })
    .eq('id', senderItemId);

  // Refund the amount back to pending_balance
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('pending_balance')
    .eq('id', payout.affiliate_id)
    .single();

  if (affiliate) {
    await supabase
      .from('affiliates')
      .update({
        pending_balance: Number(affiliate.pending_balance) + Number(payout.amount),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payout.affiliate_id);
  }

  console.log('Payout failure (internal) processed:', senderItemId);
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate PayPal email format
 * Basic validation - PayPal will do full validation
 */
export function validatePayPalEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate payout amount
 * Minimum $1.00, maximum $10,000 per transaction
 */
export function validatePayoutAmount(amount: number): {
  valid: boolean;
  error?: string;
} {
  if (amount < 1) {
    return {
      valid: false,
      error: 'Minimum payout amount is $1.00',
    };
  }

  if (amount > 10000) {
    return {
      valid: false,
      error: 'Maximum payout amount is $10,000.00 per transaction',
    };
  }

  return { valid: true };
}

// =====================================================
// ERROR HANDLING
// =====================================================

export class PayPalError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PayPalError';
  }
}

// =====================================================
// EXPORTS
// =====================================================

export const paypalService = {
  getAccessToken: getPayPalAccessToken,
  createBatchPayout,
  createSinglePayout,
  getPayoutStatus,
  getPayoutItemStatus,
  handleWebhook: handlePayPalWebhook,
  validateEmail: validatePayPalEmail,
  validateAmount: validatePayoutAmount,
};

export default paypalService;
