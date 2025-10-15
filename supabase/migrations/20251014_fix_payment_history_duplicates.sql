-- Fix Payment History: Add unique constraint on stripe_invoice_id to prevent duplicates
-- Migration created: 2025-10-14

-- Step 1: Delete duplicate payment records (keep only the first occurrence)
DELETE FROM payment_history
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY stripe_invoice_id
        ORDER BY created_at ASC
      ) as row_num
    FROM payment_history
    WHERE stripe_invoice_id IS NOT NULL
  ) t
  WHERE t.row_num > 1
);

-- Step 2: Add unique constraint on stripe_invoice_id
-- This prevents duplicate payments from being inserted
ALTER TABLE payment_history
ADD CONSTRAINT payment_history_stripe_invoice_id_unique
UNIQUE (stripe_invoice_id);

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id_created_at
ON payment_history(user_id, created_at DESC);

-- Step 4: Add comment to document the constraint
COMMENT ON CONSTRAINT payment_history_stripe_invoice_id_unique ON payment_history
IS 'Ensures each Stripe invoice is recorded only once in payment history';
