-- ============================================================================
-- WireGuard Configuration Manager - Anon Audit Log Policy
-- ============================================================================
-- 
-- Purpose: Allow anonymous users to insert LOGIN audit events during 
--          registration and login flows. This is necessary because at the
--          time of registration/login, the user doesn't have an authenticated
--          session yet in the database context.
--
-- Security: Limited to LOGIN event_type only for safety
--
-- Affected Objects:
--   - RLS Policy: audit_log_anon_insert_login on app.audit_log
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Allow anonymous users to insert LOGIN audit events
-- ----------------------------------------------------------------------------
-- This policy is restricted to LOGIN event_type only for security
-- The actor_id must match the subject_id to prevent impersonation
create policy audit_log_anon_insert_login on app.audit_log
  for insert
  to anon
  with check (
    event_type = 'LOGIN' 
    and subject_table = 'users'
    and actor_id = subject_id
  );

comment on policy audit_log_anon_insert_login on app.audit_log is 
  'Allows anonymous users to insert LOGIN audit events during registration/login. '
  'Restricted to LOGIN event_type only and requires actor_id = subject_id for security.';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- Anonymous users can now insert audit log entries for LOGIN events during
-- registration and login flows. The policy ensures:
-- 1. Only LOGIN event_type is allowed
-- 2. subject_table must be 'users'
-- 3. actor_id must equal subject_id (no impersonation)
-- 
-- ============================================================================

