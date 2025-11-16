-- ============================================================================
-- Add index for audit_log created_at DESC ordering
-- ============================================================================
-- 
-- Purpose: Optimize default sorting by created_at descending for audit log
--          queries without other filters
--
-- Affected Objects:
--   - Index: idx_audit_log_created_at_desc
--
-- Notes:
--   - This index complements existing event_type and actor_id indexes
--   - Supports the default sort order in GET /api/v1/admin/audit
-- ============================================================================

-- Create index for default descending time order
create index if not exists idx_audit_log_created_at_desc 
  on app.audit_log (created_at desc);

comment on index app.idx_audit_log_created_at_desc is 
  'Index for default descending time order in audit log queries';

