-- Add PASSWORD_CHANGE to audit_event_enum
ALTER TYPE app.audit_event_enum ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGE';

-- Add comment for documentation
COMMENT ON TYPE app.audit_event_enum IS 
'Types of events tracked in audit log: LOGIN, PEER_CLAIM, PEER_ASSIGN, PEER_DOWNLOAD, PEER_REVOKE, RESET_PASSWORD, PASSWORD_CHANGE, LIMIT_CHANGE, USER_DEACTIVATE, IMPORT';

