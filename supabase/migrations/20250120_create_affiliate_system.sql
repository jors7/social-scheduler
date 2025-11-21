-- =====================================================
-- AFFILIATE SYSTEM DATABASE SCHEMA
-- =====================================================
-- This migration creates the complete affiliate program infrastructure
-- including tables for affiliates, applications, tracking, conversions, and payouts.

-- =====================================================
-- TABLE 1: affiliates
-- =====================================================
-- Stores affiliate profile information and earnings
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 30.00, -- Percentage (e.g., 30.00 for 30%)
  total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Total commissions earned (all time)
  pending_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Available for withdrawal
  paid_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Already paid out
  referral_code TEXT NOT NULL UNIQUE, -- Unique code for tracking (e.g., "JOHN2024")
  payout_method TEXT NOT NULL DEFAULT 'paypal' CHECK (payout_method IN ('paypal', 'bank_transfer')),
  paypal_email TEXT, -- PayPal email for payouts
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_affiliate UNIQUE(user_id)
);

-- Index for fast lookups by referral code
CREATE INDEX idx_affiliates_referral_code ON public.affiliates(referral_code);
CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_status ON public.affiliates(status);

-- =====================================================
-- TABLE 2: affiliate_applications
-- =====================================================
-- Stores affiliate application questionnaire responses
CREATE TABLE IF NOT EXISTS public.affiliate_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  website TEXT,

  -- Questionnaire Responses
  application_reason TEXT NOT NULL, -- Why they want to promote (100-500 chars)
  audience_size TEXT NOT NULL, -- e.g., "1k-10k", "10k-50k"
  primary_platform TEXT NOT NULL, -- e.g., "Instagram", "YouTube"
  promotional_methods JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of methods
  social_media_profiles JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {platform, url, followers}
  affiliate_experience TEXT NOT NULL, -- e.g., "First time", "1-3 years"

  -- Application Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_application UNIQUE(user_id)
);

CREATE INDEX idx_affiliate_applications_user_id ON public.affiliate_applications(user_id);
CREATE INDEX idx_affiliate_applications_status ON public.affiliate_applications(status);
CREATE INDEX idx_affiliate_applications_email ON public.affiliate_applications(email);

-- =====================================================
-- TABLE 3: affiliate_links
-- =====================================================
-- Stores custom tracking links created by affiliates
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,

  slug TEXT NOT NULL UNIQUE, -- Unique tracking slug (e.g., "JOHN-PROMO")
  name TEXT, -- Optional friendly name (e.g., "Instagram Bio Link")
  utm_params JSONB DEFAULT '{}'::jsonb, -- UTM parameters for tracking

  -- Stats
  clicks_count INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_affiliate_links_affiliate_id ON public.affiliate_links(affiliate_id);
CREATE INDEX idx_affiliate_links_slug ON public.affiliate_links(slug);

-- =====================================================
-- TABLE 4: affiliate_clicks
-- =====================================================
-- Tracks every click on affiliate links
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,

  -- Click Metadata
  referrer_url TEXT,
  user_agent TEXT,
  ip_hash TEXT, -- Anonymized IP hash for GDPR compliance

  -- Conversion Tracking
  converted BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_affiliate_clicks_affiliate_id ON public.affiliate_clicks(affiliate_id);
CREATE INDEX idx_affiliate_clicks_link_id ON public.affiliate_clicks(link_id);
CREATE INDEX idx_affiliate_clicks_created_at ON public.affiliate_clicks(created_at);
CREATE INDEX idx_affiliate_clicks_converted ON public.affiliate_clicks(converted);

-- =====================================================
-- TABLE 5: affiliate_conversions
-- =====================================================
-- Tracks conversions and commissions earned
CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
  click_id UUID REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,

  -- Commission Details
  commission_amount DECIMAL(10,2) NOT NULL, -- Amount earned (e.g., 2.70 for $9 * 30%)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'refunded')),

  -- Payment Tracking
  payment_date TIMESTAMP WITH TIME ZONE, -- Date when customer paid
  stripe_invoice_id TEXT, -- Stripe invoice ID for reference

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_affiliate_conversions_affiliate_id ON public.affiliate_conversions(affiliate_id);
CREATE INDEX idx_affiliate_conversions_customer_user_id ON public.affiliate_conversions(customer_user_id);
CREATE INDEX idx_affiliate_conversions_subscription_id ON public.affiliate_conversions(subscription_id);
CREATE INDEX idx_affiliate_conversions_status ON public.affiliate_conversions(status);
CREATE INDEX idx_affiliate_conversions_payment_date ON public.affiliate_conversions(payment_date);

-- =====================================================
-- TABLE 6: affiliate_payouts
-- =====================================================
-- Tracks payout requests and processing
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,

  -- Payout Details
  amount DECIMAL(10,2) NOT NULL, -- Amount being paid out
  payout_method TEXT NOT NULL CHECK (payout_method IN ('paypal', 'bank_transfer')),

  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- PayPal Integration
  paypal_batch_id TEXT, -- PayPal batch ID
  paypal_payout_item_id TEXT, -- PayPal payout item ID
  paypal_transaction_id TEXT, -- PayPal transaction ID (after completion)

  -- Error Handling
  failure_reason TEXT,

  -- Timestamps
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_affiliate_payouts_affiliate_id ON public.affiliate_payouts(affiliate_id);
CREATE INDEX idx_affiliate_payouts_status ON public.affiliate_payouts(status);
CREATE INDEX idx_affiliate_payouts_requested_at ON public.affiliate_payouts(requested_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: affiliates
-- =====================================================

-- Affiliates can view their own profile
CREATE POLICY "Affiliates can view own profile"
  ON public.affiliates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Affiliates can update their own profile (limited fields)
CREATE POLICY "Affiliates can update own profile"
  ON public.affiliates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access (for backend operations)
CREATE POLICY "Service role has full access to affiliates"
  ON public.affiliates
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Admin users have full access
CREATE POLICY "Admin users have full access to affiliates"
  ON public.affiliates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES: affiliate_applications
-- =====================================================

-- Users can view their own application
CREATE POLICY "Users can view own application"
  ON public.affiliate_applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own application
CREATE POLICY "Users can insert own application"
  ON public.affiliate_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to applications"
  ON public.affiliate_applications
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Admin users have full access
CREATE POLICY "Admin users have full access to applications"
  ON public.affiliate_applications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES: affiliate_links
-- =====================================================

-- Affiliates can manage their own links
CREATE POLICY "Affiliates can manage own links"
  ON public.affiliate_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = affiliate_links.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to affiliate_links"
  ON public.affiliate_links
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- RLS POLICIES: affiliate_clicks
-- =====================================================

-- Affiliates can view their own clicks
CREATE POLICY "Affiliates can view own clicks"
  ON public.affiliate_clicks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = affiliate_clicks.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- Service role has full access (needed for tracking)
CREATE POLICY "Service role has full access to clicks"
  ON public.affiliate_clicks
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- RLS POLICIES: affiliate_conversions
-- =====================================================

-- Affiliates can view their own conversions
CREATE POLICY "Affiliates can view own conversions"
  ON public.affiliate_conversions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = affiliate_conversions.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to conversions"
  ON public.affiliate_conversions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Admin users have full access
CREATE POLICY "Admin users have full access to conversions"
  ON public.affiliate_conversions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES: affiliate_payouts
-- =====================================================

-- Affiliates can view and request their own payouts
CREATE POLICY "Affiliates can manage own payouts"
  ON public.affiliate_payouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = affiliate_payouts.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to payouts"
  ON public.affiliate_payouts
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Admin users have full access
CREATE POLICY "Admin users have full access to payouts"
  ON public.affiliate_payouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to generate a unique referral code from name
CREATE OR REPLACE FUNCTION generate_referral_code(first_name TEXT, last_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base code from first name + random number
  base_code := UPPER(SUBSTRING(first_name FROM 1 FOR 4)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  final_code := base_code;

  -- Check if code exists, if so add counter
  WHILE EXISTS (SELECT 1 FROM public.affiliates WHERE referral_code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || counter::TEXT;
  END LOOP;

  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Function to update affiliate updated_at timestamp
CREATE OR REPLACE FUNCTION update_affiliate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on affiliates table
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_updated_at();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.affiliates IS 'Stores affiliate profile information, earnings, and payout settings';
COMMENT ON TABLE public.affiliate_applications IS 'Stores affiliate application forms and questionnaire responses';
COMMENT ON TABLE public.affiliate_links IS 'Tracks custom referral links created by affiliates';
COMMENT ON TABLE public.affiliate_clicks IS 'Records every click on affiliate links for attribution';
COMMENT ON TABLE public.affiliate_conversions IS 'Tracks conversions (sign-ups) and commissions earned';
COMMENT ON TABLE public.affiliate_payouts IS 'Manages payout requests and PayPal processing';

COMMENT ON COLUMN public.affiliates.commission_rate IS 'Commission percentage (e.g., 30.00 for 30%)';
COMMENT ON COLUMN public.affiliates.referral_code IS 'Unique tracking code used in ?ref= parameter';
COMMENT ON COLUMN public.affiliate_applications.promotional_methods IS 'JSON array of promotion methods selected';
COMMENT ON COLUMN public.affiliate_applications.social_media_profiles IS 'JSON array of social profiles with followers';
COMMENT ON COLUMN public.affiliate_clicks.ip_hash IS 'Anonymized IP hash for GDPR-compliant tracking';
COMMENT ON COLUMN public.affiliate_conversions.commission_amount IS 'Commission earned on this conversion (in dollars)';
COMMENT ON COLUMN public.affiliate_payouts.paypal_batch_id IS 'PayPal batch ID for tracking payout status';
