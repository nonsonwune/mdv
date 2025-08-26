-- Check current enum values in the database
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status');

-- If the above shows "pending_payment" instead of "PendingPayment", 
-- we need to fix the enum values

-- IMPORTANT: Run this in a transaction
BEGIN;

-- Step 1: Create a temporary column with the correct enum type
ALTER TYPE order_status RENAME TO order_status_old;

-- Step 2: Create new enum with correct values
CREATE TYPE order_status AS ENUM ('PendingPayment', 'Paid', 'Cancelled', 'Refunded');

-- Step 3: Update the orders table to use the new enum
ALTER TABLE orders 
  ALTER COLUMN status TYPE order_status 
  USING CASE 
    WHEN status::text = 'pending_payment' THEN 'PendingPayment'::order_status
    WHEN status::text = 'PendingPayment' THEN 'PendingPayment'::order_status
    WHEN status::text = 'paid' THEN 'Paid'::order_status
    WHEN status::text = 'Paid' THEN 'Paid'::order_status
    WHEN status::text = 'cancelled' THEN 'Cancelled'::order_status
    WHEN status::text = 'Cancelled' THEN 'Cancelled'::order_status
    WHEN status::text = 'refunded' THEN 'Refunded'::order_status
    WHEN status::text = 'Refunded' THEN 'Refunded'::order_status
    ELSE 'PendingPayment'::order_status
  END;

-- Step 4: Drop the old enum type
DROP TYPE order_status_old;

-- Verify the fix
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status');

-- If everything looks good, commit
COMMIT;

-- If something went wrong, rollback
-- ROLLBACK;
