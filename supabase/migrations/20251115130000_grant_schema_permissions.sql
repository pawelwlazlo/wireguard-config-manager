-- ============================================================================
-- Grant Permissions to Schema app
-- ============================================================================
-- 
-- Purpose: Grants necessary permissions to Supabase roles (anon, authenticated, 
--          service_role) to access the app schema and its objects.
--
-- Problem: By default, custom schemas need explicit USAGE grants for roles
--          to be able to access tables and functions within them.
--
-- Affected Objects:
--   - Schema: app (USAGE grant)
--   - Tables: All tables in app schema (SELECT, INSERT, UPDATE, DELETE)
--   - Sequences: All sequences in app schema (USAGE, SELECT)
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Step 1: Grant USAGE on schema to Supabase roles
-- ----------------------------------------------------------------------------
-- This allows roles to "see" and access objects in the app schema
GRANT USAGE ON SCHEMA app TO anon;
GRANT USAGE ON SCHEMA app TO authenticated;
GRANT USAGE ON SCHEMA app TO service_role;

-- ----------------------------------------------------------------------------
-- Step 2: Grant permissions on all existing tables
-- ----------------------------------------------------------------------------
-- anon role: SELECT only (read-only access, RLS will further restrict)
GRANT SELECT ON ALL TABLES IN SCHEMA app TO anon;

-- authenticated role: Full access (RLS policies will control actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO authenticated;

-- service_role: Full access (bypasses RLS - admin operations)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO service_role;

-- ----------------------------------------------------------------------------
-- Step 3: Grant permissions on sequences (for serial/identity columns)
-- ----------------------------------------------------------------------------
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app TO service_role;

-- ----------------------------------------------------------------------------
-- Step 4: Set default privileges for future objects
-- ----------------------------------------------------------------------------
-- This ensures new tables/sequences automatically get correct permissions

-- For tables created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA app 
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA app 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA app 
  GRANT ALL PRIVILEGES ON TABLES TO service_role;

-- For sequences created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA app 
  GRANT USAGE, SELECT ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA app 
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA app 
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

-- ----------------------------------------------------------------------------
-- Step 5: Grant execute on functions (if any)
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA app 
  GRANT EXECUTE ON FUNCTIONS TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA app 
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA app 
  GRANT EXECUTE ON FUNCTIONS TO service_role;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- Summary of changes:
-- 1. ✅ Granted USAGE on schema app to all Supabase roles
-- 2. ✅ Granted appropriate table permissions (SELECT, INSERT, UPDATE, DELETE)
-- 3. ✅ Granted sequence permissions for auto-increment columns
-- 4. ✅ Set default privileges for future objects
-- 5. ✅ Granted function execution permissions
--
-- Security notes:
-- - RLS policies still control actual data access
-- - anon role: read-only (SELECT)
-- - authenticated role: full CRUD (controlled by RLS)
-- - service_role: full access (bypasses RLS - use with caution!)
--
-- Next steps:
-- 1. Apply migration: supabase db reset (or supabase db push if remote)
-- 2. Restart Astro dev server
-- 3. Test endpoints
-- ============================================================================

