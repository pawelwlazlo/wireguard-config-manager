-- ============================================================================
-- Add Sample Audit Log Data for Testing
-- ============================================================================
-- 
-- Purpose: Create sample audit log entries for UI testing
-- 
-- Note: This migration is for development/testing only
--       Remove or skip in production
-- ============================================================================

-- Insert sample audit log entries (using existing user/peer IDs from your database)
-- Replace UUIDs with actual IDs from your system

-- Sample LOGIN event
INSERT INTO app.audit_log (event_type, actor_id, subject_table, subject_id, metadata, created_at)
SELECT 
  'LOGIN'::app.audit_event_enum,
  id,
  'users',
  id,
  '{"ip_address": "192.168.1.1", "user_agent": "Mozilla/5.0"}'::jsonb,
  NOW() - INTERVAL '5 hours'
FROM app.users 
WHERE email LIKE '%@%'
LIMIT 1;

-- Sample PEER_CLAIM events
INSERT INTO app.audit_log (event_type, actor_id, subject_table, subject_id, metadata, created_at)
SELECT 
  'PEER_CLAIM'::app.audit_event_enum,
  u.id,
  'peers',
  p.id,
  jsonb_build_object('peer_id', p.id, 'public_key', p.public_key),
  NOW() - INTERVAL '3 hours'
FROM app.users u
CROSS JOIN app.peers p
WHERE u.email LIKE '%@%' AND p.status = 'active'
LIMIT 2;

-- Sample PEER_DOWNLOAD events
INSERT INTO app.audit_log (event_type, actor_id, subject_table, subject_id, metadata, created_at)
SELECT 
  'PEER_DOWNLOAD'::app.audit_event_enum,
  u.id,
  'peers',
  p.id,
  jsonb_build_object('peer_id', p.id, 'public_key', p.public_key, 'filename', COALESCE(p.friendly_name || '.conf', 'peer.conf')),
  NOW() - INTERVAL '2 hours'
FROM app.users u
CROSS JOIN app.peers p
WHERE u.email LIKE '%@%' AND p.status = 'active'
LIMIT 3;

-- Sample PASSWORD_CHANGE event
INSERT INTO app.audit_log (event_type, actor_id, subject_table, subject_id, metadata, created_at)
SELECT 
  'PASSWORD_CHANGE'::app.audit_event_enum,
  id,
  'users',
  id,
  '{}'::jsonb,
  NOW() - INTERVAL '1 hour'
FROM app.users 
WHERE email LIKE '%@%'
LIMIT 1;

-- Sample LIMIT_CHANGE event (admin action)
INSERT INTO app.audit_log (event_type, actor_id, subject_table, subject_id, metadata, created_at)
SELECT 
  'LIMIT_CHANGE'::app.audit_event_enum,
  admin.id,
  'users',
  target.id,
  jsonb_build_object('old_limit', 5, 'new_limit', 10, 'user_email', target.email),
  NOW() - INTERVAL '30 minutes'
FROM app.users admin
CROSS JOIN app.users target
WHERE EXISTS (
  SELECT 1 FROM app.user_roles ur
  JOIN app.roles r ON ur.role_id = r.id
  WHERE ur.user_id = admin.id AND r.name = 'admin'
)
AND target.id != admin.id
LIMIT 1;

-- Sample IMPORT event
INSERT INTO app.audit_log (event_type, actor_id, subject_table, subject_id, metadata, created_at)
SELECT 
  'IMPORT'::app.audit_event_enum,
  admin.id,
  'import_batches',
  ib.id,
  jsonb_build_object('batch_id', ib.id, 'files_imported', 10, 'total_files', 10),
  NOW() - INTERVAL '4 hours'
FROM app.users admin
CROSS JOIN app.import_batches ib
WHERE EXISTS (
  SELECT 1 FROM app.user_roles ur
  JOIN app.roles r ON ur.role_id = r.id
  WHERE ur.user_id = admin.id AND r.name = 'admin'
)
LIMIT 1;

COMMENT ON TABLE app.audit_log IS 'Audit trail of all system events (with sample data for testing)';

