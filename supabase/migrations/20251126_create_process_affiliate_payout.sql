-- Atomic balance update function for affiliate payouts
-- Prevents race conditions when processing concurrent payouts
CREATE OR REPLACE FUNCTION process_affiliate_payout(
  p_affiliate_id UUID,
  p_amount DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE affiliates
  SET
    pending_balance = GREATEST(0, pending_balance - p_amount),
    paid_balance = COALESCE(paid_balance, 0) + p_amount,
    updated_at = NOW()
  WHERE id = p_affiliate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Affiliate not found: %', p_affiliate_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated and service role
GRANT EXECUTE ON FUNCTION process_affiliate_payout(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION process_affiliate_payout(UUID, DECIMAL) TO service_role;
