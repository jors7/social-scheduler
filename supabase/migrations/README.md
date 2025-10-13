# Database Migrations

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Copy the contents of the migration file (e.g., `create_platform_requests_table.sql`)
5. Paste into the SQL Editor
6. Click **"Run"**

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

## Migrations List

### `create_platform_requests_table.sql`
**Purpose**: Creates the `platform_requests` table for storing user-requested platforms and votes

**What it does**:
- Creates `platform_requests` table with vote tracking
- Adds indexes for performance
- Enables Row Level Security (RLS)
- Sets up policies for read/write access
- Creates auto-updating `updated_at` trigger

**Required**: Yes - needed for the "Request Platform" feature to work

**Run this migration**: Before using the Request Platform feature in the create post page

## Verifying Migrations

After running a migration, you can verify it worked by:

1. Go to **Table Editor** in Supabase Dashboard
2. Look for the new table (e.g., `platform_requests`)
3. Check that RLS is enabled (shield icon should be visible)

## Rollback

If you need to undo a migration:

```sql
-- For platform_requests table
DROP TABLE IF EXISTS platform_requests CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

**⚠️ Warning**: Rolling back will delete all data in the table!
