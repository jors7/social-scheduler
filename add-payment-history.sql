-- Add payment history for jan@weekhack.com
INSERT INTO payment_history (
  user_id,
  amount,
  currency,
  status,
  description,
  created_at
) VALUES (
  '34da8335-3c9d-44b8-a13f-b7aff8e3b3d7',
  9000,
  'usd',
  'succeeded',
  'Subscription to Starter plan (yearly)',
  NOW()
);