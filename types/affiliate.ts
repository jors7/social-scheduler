// =====================================================
// AFFILIATE SYSTEM TYPES
// =====================================================
// TypeScript interfaces and types for the affiliate program

// =====================================================
// DATABASE TYPES
// =====================================================

export type AffiliateStatus = 'pending' | 'active' | 'suspended';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type ConversionStatus = 'pending' | 'approved' | 'paid' | 'refunded';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PayoutMethod = 'paypal' | 'bank_transfer';
export type UserType = 'member' | 'affiliate' | 'both';

// =====================================================
// AFFILIATE PROFILE
// =====================================================

export interface Affiliate {
  id: string;
  user_id: string;
  status: AffiliateStatus;
  commission_rate: number; // Percentage (e.g., 30.00)
  total_earnings: number; // Total commissions earned (all time)
  pending_balance: number; // Available for withdrawal
  paid_balance: number; // Already paid out
  referral_code: string; // Unique tracking code
  payout_method: PayoutMethod;
  paypal_email?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// AFFILIATE APPLICATION
// =====================================================

export interface SocialMediaProfile {
  platform: string; // e.g., "Instagram", "YouTube"
  url: string;
  followers: string; // e.g., "10k", "50000"
}

export interface AffiliateApplication {
  id: string;
  user_id: string;

  // Basic Information
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
  website?: string;

  // Questionnaire Responses
  application_reason: string; // Why they want to promote
  audience_size: string; // e.g., "1k-10k", "10k-50k"
  primary_platform: string; // e.g., "Instagram", "YouTube"
  promotional_methods: string[]; // Array of methods
  social_media_profiles: SocialMediaProfile[]; // Array of profiles
  affiliate_experience: string; // e.g., "First time", "1-3 years"

  // Application Status
  status: ApplicationStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;

  created_at: string;
}

// Application form data (before submission)
export interface AffiliateApplicationForm {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirm: string;
  company: string;
  website: string;
  payout_method: PayoutMethod;
  paypal_email: string;
  application_reason: string;
  audience_size: string;
  primary_platform: string;
  promotional_methods: string[];
  social_media_profiles: SocialMediaProfile[];
  affiliate_experience: string;
}

// =====================================================
// AFFILIATE LINKS
// =====================================================

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface AffiliateLink {
  id: string;
  affiliate_id: string;
  slug: string; // Unique tracking slug
  name?: string; // Optional friendly name
  utm_params: UTMParams;
  clicks_count: number;
  conversions_count: number;
  created_at: string;
}

// =====================================================
// AFFILIATE CLICKS
// =====================================================

export interface AffiliateClick {
  id: string;
  affiliate_id: string;
  link_id?: string;
  referrer_url?: string;
  user_agent?: string;
  ip_hash?: string; // Anonymized IP hash
  converted: boolean;
  created_at: string;
}

// =====================================================
// AFFILIATE CONVERSIONS
// =====================================================

export interface AffiliateConversion {
  id: string;
  affiliate_id: string;
  customer_user_id: string;
  subscription_id: string;
  click_id?: string;
  commission_amount: number; // Amount earned (in dollars)
  status: ConversionStatus;
  payment_date?: string;
  stripe_invoice_id?: string;
  created_at: string;
}

// Conversion with customer details (for display)
export interface ConversionWithDetails extends AffiliateConversion {
  customer_email?: string;
  customer_name?: string;
  plan_name?: string;
  plan_amount?: number;
}

// =====================================================
// AFFILIATE PAYOUTS
// =====================================================

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  amount: number;
  payout_method: PayoutMethod;
  status: PayoutStatus;
  paypal_batch_id?: string;
  paypal_payout_item_id?: string;
  paypal_transaction_id?: string;
  failure_reason?: string;
  requested_at: string;
  processed_at?: string;
  created_at: string;
}

// =====================================================
// DASHBOARD STATS
// =====================================================

export interface AffiliateStats {
  total_earnings: number;
  pending_balance: number;
  paid_balance: number;
  total_conversions: number;
  total_clicks: number;
  conversion_rate: number; // Percentage
  active_customers: number; // Customers with active subscriptions
  monthly_recurring_commission: number; // Expected monthly income
}

export interface AffiliateAnalytics {
  clicks_by_day: Array<{ date: string; count: number }>;
  conversions_by_day: Array<{ date: string; count: number }>;
  earnings_by_month: Array<{ month: string; amount: number }>;
  top_links: Array<{
    link_id: string;
    slug: string;
    name?: string;
    clicks: number;
    conversions: number;
    conversion_rate: number;
  }>;
}

// =====================================================
// ADMIN DASHBOARD TYPES
// =====================================================

export interface AffiliateWithUser extends Affiliate {
  user_email?: string;
  user_full_name?: string;
  application?: AffiliateApplication;
}

export interface AdminAffiliateStats {
  total_affiliates: number;
  active_affiliates: number;
  pending_applications: number;
  total_commissions_paid: number;
  pending_payouts_amount: number;
  average_conversion_rate: number;
  monthly_program_cost: number; // Total commissions this month
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

// Application submission request
export interface SubmitApplicationRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  company?: string;
  website?: string;
  paypal_email: string;
  application_reason: string;
  audience_size: string;
  primary_platform: string;
  promotional_methods: string[];
  social_media_profiles: SocialMediaProfile[];
  affiliate_experience: string;
}

// Application approval/rejection request
export interface ReviewApplicationRequest {
  application_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

// Payout request
export interface RequestPayoutRequest {
  amount: number;
}

// Process payout request (admin)
export interface ProcessPayoutRequest {
  payout_ids: string[];
  method: 'paypal' | 'manual';
}

// Create link request
export interface CreateLinkRequest {
  name?: string;
  utm_params?: UTMParams;
}

// Update profile request
export interface UpdateAffiliateProfileRequest {
  paypal_email?: string;
  payout_method?: PayoutMethod;
}

// =====================================================
// PAYPAL API TYPES
// =====================================================

export interface PayPalAccessTokenResponse {
  scope: string;
  access_token: string;
  token_type: string;
  app_id: string;
  expires_in: number;
  nonce: string;
}

export interface PayPalPayoutItem {
  recipient_type: 'EMAIL';
  amount: {
    value: string;
    currency: 'USD';
  };
  note?: string;
  sender_item_id: string; // Unique ID for tracking
  receiver: string; // PayPal email
}

export interface PayPalPayoutRequest {
  sender_batch_header: {
    sender_batch_id: string; // Unique batch ID
    email_subject: string;
    email_message?: string;
  };
  items: PayPalPayoutItem[];
}

export interface PayPalPayoutResponse {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
    sender_batch_header: {
      sender_batch_id: string;
      email_subject: string;
    };
  };
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface PayPalPayoutStatus {
  batch_header: {
    payout_batch_id: string;
    batch_status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'DENIED' | 'CANCELED';
    time_created: string;
    time_completed?: string;
    sender_batch_header: {
      sender_batch_id: string;
    };
    amount: {
      value: string;
      currency: string;
    };
    fees: {
      value: string;
      currency: string;
    };
  };
  items: Array<{
    payout_item_id: string;
    transaction_id?: string;
    transaction_status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNCLAIMED' | 'RETURNED' | 'ONHOLD' | 'BLOCKED' | 'REFUNDED' | 'REVERSED';
    payout_item_fee?: {
      value: string;
      currency: string;
    };
    payout_batch_id: string;
    sender_batch_id: string;
    payout_item: {
      recipient_type: string;
      amount: {
        value: string;
        currency: string;
      };
      note?: string;
      receiver: string;
      sender_item_id: string;
    };
    time_processed?: string;
    errors?: {
      name: string;
      message: string;
    };
  }>;
}

// =====================================================
// EMAIL TEMPLATE DATA
// =====================================================

export interface ApplicationSubmittedEmailData {
  admin_email: string;
  applicant_name: string;
  applicant_email: string;
  application_id: string;
  application_date: string;
}

export interface ApplicationApprovedEmailData {
  affiliate_email: string;
  affiliate_name: string;
  referral_code: string;
  login_url: string;
  commission_rate: number;
}

export interface ApplicationRejectedEmailData {
  applicant_email: string;
  applicant_name: string;
  rejection_reason?: string;
}

export interface CommissionEarnedEmailData {
  affiliate_email: string;
  affiliate_name: string;
  commission_amount: number;
  customer_plan: string;
  payment_date: string;
  pending_balance: number;
  is_first_commission: boolean;
}

export interface PayoutProcessedEmailData {
  affiliate_email: string;
  affiliate_name: string;
  payout_amount: number;
  payout_method: PayoutMethod;
  paypal_transaction_id?: string;
  processed_date: string;
}

export interface MonthlyAffiliateReport {
  affiliate_email: string;
  affiliate_name: string;
  month: string;
  total_earnings: number;
  new_conversions: number;
  total_clicks: number;
  pending_balance: number;
}

// =====================================================
// UTILITY TYPES
// =====================================================

// Dropdown options for forms
export const AUDIENCE_SIZE_OPTIONS = [
  { value: '< 1k', label: 'Less than 1,000' },
  { value: '1k-10k', label: '1,000 - 10,000' },
  { value: '10k-50k', label: '10,000 - 50,000' },
  { value: '50k-100k', label: '50,000 - 100,000' },
  { value: '100k+', label: '100,000+' },
] as const;

export const PRIMARY_PLATFORM_OPTIONS = [
  { value: 'Instagram', label: 'Instagram' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'Blog/Website', label: 'Blog/Website' },
  { value: 'Email List', label: 'Email List' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Twitter/X', label: 'Twitter/X' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Other', label: 'Other' },
] as const;

export const PROMOTIONAL_METHODS = [
  'Social Media Posts',
  'Blog Reviews',
  'Email Marketing',
  'YouTube Videos',
  'Paid Ads',
  'SEO/Organic',
  'Other',
] as const;

export const AFFILIATE_EXPERIENCE_OPTIONS = [
  { value: 'First time', label: 'First time (This is my first affiliate program)' },
  { value: 'Less than 1 year', label: 'Less than 1 year' },
  { value: '1-3 years', label: '1-3 years' },
  { value: '3+ years', label: '3+ years' },
] as const;

export const SOCIAL_PLATFORMS = [
  'Instagram',
  'YouTube',
  'Blog',
  'TikTok',
  'Twitter/X',
  'LinkedIn',
  'Facebook',
] as const;
