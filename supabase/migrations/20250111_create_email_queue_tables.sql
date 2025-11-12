-- Migration: Create tables for email queue, idempotency, and webhook monitoring
-- Date: 2025-01-11
-- Purpose: Add email retry infrastructure, deduplication, and webhook tracking

-- =====================================================
-- 1. PENDING_EMAILS: Queue for email retries
-- =====================================================
CREATE TABLE IF NOT EXISTS pending_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'payment_receipt', 'payment_failed', 'plan_upgraded', etc.
  subject TEXT NOT NULL,
  template_data JSONB NOT NULL, -- Props for the email template
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'failed', 'cancelled'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Allow delayed sending (e.g., reminders)
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB -- Extra context: invoice_id, subscription_id, etc.
);

-- Index for processing queue
CREATE INDEX IF NOT EXISTS idx_pending_emails_status_scheduled
  ON pending_emails(status, scheduled_for)
  WHERE status IN ('pending', 'failed');

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_pending_emails_user_id
  ON pending_emails(user_id);

-- Index for metadata queries (e.g., find by invoice_id)
CREATE INDEX IF NOT EXISTS idx_pending_emails_metadata
  ON pending_emails USING GIN(metadata);

-- =====================================================
-- 2. SENT_EMAILS: Idempotency tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL, -- Hash of (user_id + email_type + unique_identifier)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL,
  pending_email_id UUID REFERENCES pending_emails(id) ON DELETE SET NULL,
  resend_email_id TEXT, -- ID returned from Resend API
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days') -- Cleanup after 7 days
);

-- Index for idempotency checks (fast lookups)
CREATE INDEX IF NOT EXISTS idx_sent_emails_idempotency_key
  ON sent_emails(idempotency_key);

-- Index for cleanup (delete expired entries)
CREATE INDEX IF NOT EXISTS idx_sent_emails_expires_at
  ON sent_emails(expires_at);

-- =====================================================
-- 3. WEBHOOK_EVENTS: Comprehensive webhook logging
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL, -- 'invoice.payment_succeeded', 'customer.subscription.updated', etc.
  status TEXT NOT NULL DEFAULT 'received', -- 'received', 'processing', 'completed', 'failed'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  processing_time_ms INTEGER, -- How long webhook took to process
  error_message TEXT,
  event_data JSONB, -- Full Stripe event payload (for debugging)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Index for Stripe event lookups (prevent duplicate processing)
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id
  ON webhook_events(stripe_event_id);

-- Index for monitoring dashboard queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_status
  ON webhook_events(created_at DESC, status);

-- Index for user-specific webhook history
CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id
  ON webhook_events(user_id);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE pending_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- pending_emails policies
-- Users can view their own pending emails
CREATE POLICY "Users can view own pending emails"
  ON pending_emails FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all pending emails
CREATE POLICY "Admins can view all pending emails"
  ON pending_emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Service role can do everything (for cron jobs and webhooks)
CREATE POLICY "Service role full access to pending_emails"
  ON pending_emails FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- sent_emails policies
-- Users can view their own sent emails
CREATE POLICY "Users can view own sent emails"
  ON sent_emails FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all sent emails
CREATE POLICY "Admins can view all sent emails"
  ON sent_emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "Service role full access to sent_emails"
  ON sent_emails FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- webhook_events policies
-- Admins can view all webhook events
CREATE POLICY "Admins can view all webhook events"
  ON webhook_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "Service role full access to webhook_events"
  ON webhook_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- Cleanup function for expired sent_emails
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_sent_emails()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM sent_emails
  WHERE expires_at < NOW();
END;
$$;

-- =====================================================
-- Helper function: Get failed email stats
-- =====================================================
CREATE OR REPLACE FUNCTION get_failed_email_stats(
  time_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  email_type TEXT,
  failure_count BIGINT,
  last_failure TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    email_type,
    COUNT(*) as failure_count,
    MAX(last_attempt_at) as last_failure
  FROM pending_emails
  WHERE
    status = 'failed'
    AND created_at > NOW() - (time_window_hours || ' hours')::INTERVAL
  GROUP BY email_type
  ORDER BY failure_count DESC;
$$;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE pending_emails IS 'Queue for email retries with exponential backoff';
COMMENT ON TABLE sent_emails IS 'Idempotency tracking to prevent duplicate emails';
COMMENT ON TABLE webhook_events IS 'Comprehensive logging of all Stripe webhook events';
COMMENT ON FUNCTION cleanup_expired_sent_emails IS 'Cron job to delete expired sent_emails entries (run daily)';
COMMENT ON FUNCTION get_failed_email_stats IS 'Get statistics on failed emails for monitoring';
