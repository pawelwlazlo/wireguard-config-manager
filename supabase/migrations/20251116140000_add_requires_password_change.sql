-- Add requires_password_change column to users table
-- This flag is used to force users to change their password after admin reset

ALTER TABLE app.users 
ADD COLUMN requires_password_change BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN app.users.requires_password_change IS 
'Flag indicating user must change password on next login. Set to true after admin password reset.';

