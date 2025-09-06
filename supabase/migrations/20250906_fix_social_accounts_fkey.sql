-- Alternative fix: Update social_accounts to reference auth.users instead of public.users
-- This is simpler and doesn't require maintaining a separate users table

-- First, check the current foreign key constraint
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'social_accounts_user_id_fkey'
    AND table_name = 'social_accounts'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE 'Found social_accounts_user_id_fkey constraint, will update it';
  ELSE
    RAISE NOTICE 'Constraint not found, checking for other user_id constraints';
  END IF;
END $$;

-- Drop the existing foreign key constraint if it points to public.users
ALTER TABLE social_accounts 
DROP CONSTRAINT IF EXISTS social_accounts_user_id_fkey;

-- Add the foreign key constraint to auth.users instead
ALTER TABLE social_accounts 
ADD CONSTRAINT social_accounts_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Verify the change
DO $$
DECLARE
  fkey_table TEXT;
BEGIN
  SELECT 
    ccu.table_name INTO fkey_table
  FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
  WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'social_accounts'
    AND tc.constraint_name LIKE '%user_id%'
  LIMIT 1;
  
  RAISE NOTICE 'social_accounts.user_id now references %.users', fkey_table;
END $$;