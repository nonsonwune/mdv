-- Migration: Add force_password_change column to users table
-- Date: 2024-01-01
-- Description: Add support for forcing password changes on next login

-- Add the new column with default value
ALTER TABLE users 
ADD COLUMN force_password_change BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN users.force_password_change IS 'Force user to change password on next login (used after admin password reset)';

-- Create index for performance (optional, but recommended for queries)
CREATE INDEX idx_users_force_password_change ON users(force_password_change) WHERE force_password_change = TRUE;

-- Update any existing users who might need password changes (optional)
-- This is commented out by default - uncomment if you want to force all users to change passwords
-- UPDATE users SET force_password_change = TRUE WHERE password_hash IS NULL OR password_hash = '';

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'force_password_change';

-- Expected output:
-- column_name           | data_type | is_nullable | column_default
-- force_password_change | boolean   | YES         | false
