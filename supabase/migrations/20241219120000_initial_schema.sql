-- ============================================================================
-- WireGuard Configuration Manager - Initial Database Schema Migration
-- ============================================================================
-- 
-- Purpose: Creates the complete database schema for WireGuard configuration
--          manager including tables, enums, indexes, triggers, and RLS policies.
--
-- Affected Objects:
--   - Schema: app
--   - ENUMs: user_status_enum, peer_status_enum, audit_event_enum
--   - Tables: users, roles, user_roles, peers, audit_log, accepted_domains,
--            config_kv, user_limit_history, password_reset_tokens, import_batches
--   - Indexes: Multiple performance indexes
--   - Functions: update_updated_at_column()
--   - Triggers: updated_at triggers for all tables
--   - RLS Policies: Row-level security for all tables
--
-- Notes:
--   - All tables use Row Level Security (RLS) enabled by default
--   - All timestamps are stored in UTC (timestamptz)
--   - Table naming follows snake_case convention
--   - This migration assumes Supabase Auth is already configured
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Step 1: Create schema
-- ----------------------------------------------------------------------------
-- Creates the application schema to separate app tables from public schema
create schema if not exists app;

-- ----------------------------------------------------------------------------
-- Step 2: Enable required PostgreSQL extensions
-- ----------------------------------------------------------------------------
-- uuid-ossp: for uuid generation functions
create extension if not exists "uuid-ossp";

-- pgcrypto: for cryptographic functions (encryption of peer configs)
create extension if not exists "pgcrypto";

-- pg_trgm: for trigram-based text search (friendly_name search in peers)
create extension if not exists "pg_trgm";

-- pg_stat_statements: for query performance monitoring
create extension if not exists "pg_stat_statements";

-- ----------------------------------------------------------------------------
-- Step 3: Create ENUM types
-- ----------------------------------------------------------------------------

-- user_status_enum: status of user accounts
create type app.user_status_enum as enum (
  'active',    -- account is active and can use the system
  'inactive'   -- account is deactivated
);

comment on type app.user_status_enum is 'Status of user accounts in the system';

-- peer_status_enum: status of WireGuard peer configurations
create type app.peer_status_enum as enum (
  'available', -- peer is available for claiming/assignment
  'active',    -- peer is assigned and active
  'inactive'   -- peer is revoked/deactivated
);

comment on type app.peer_status_enum is 'Status of WireGuard peer configurations';

-- audit_event_enum: types of events logged in audit_log
create type app.audit_event_enum as enum (
  'LOGIN',           -- user login event
  'PEER_CLAIM',      -- user claimed an available peer
  'PEER_ASSIGN',     -- admin assigned peer to user
  'PEER_DOWNLOAD',   -- user downloaded peer configuration
  'PEER_REVOKE',     -- peer was revoked/deactivated
  'RESET_PASSWORD',  -- password reset initiated
  'LIMIT_CHANGE',    -- user peer limit was changed
  'USER_DEACTIVATE', -- user account was deactivated
  'IMPORT'           -- peer configurations were imported
);

comment on type app.audit_event_enum is 'Types of events logged in the audit log';

-- ----------------------------------------------------------------------------
-- Step 4: Create tables
-- ----------------------------------------------------------------------------
-- Note: Tables are created in dependency order to satisfy foreign key constraints

-- ----------------------------------------------------------------------------
-- Table: config_kv
-- Purpose: Simple key-value configuration storage
-- Note: Created first as users.peer_limit has a default that references it
-- ----------------------------------------------------------------------------
create table app.config_kv (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

comment on table app.config_kv is 'Key-value configuration storage for system settings';
comment on column app.config_kv.key is 'Configuration key (e.g., default_peer_limit)';
comment on column app.config_kv.value is 'Configuration value as text';
comment on column app.config_kv.updated_at is 'Timestamp of last update';

-- Insert default configuration values
insert into app.config_kv (key, value) values ('default_peer_limit', '10')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- Table: users
-- Purpose: User accounts synchronized with Supabase Auth
-- Note: id should match auth.users.id
-- ----------------------------------------------------------------------------
create table app.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  status app.user_status_enum not null default 'active',
  peer_limit integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_format check (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

comment on table app.users is 'User accounts synchronized with Supabase Auth';
comment on column app.users.id is 'Primary key matching auth.users.id';
comment on column app.users.email is 'User email address (must be unique and valid format)';
comment on column app.users.status is 'Account status (active/inactive)';
comment on column app.users.peer_limit is 'Maximum number of peers user can own (default: 10)';
comment on column app.users.created_at is 'Account creation timestamp';
comment on column app.users.updated_at is 'Last update timestamp';

-- ----------------------------------------------------------------------------
-- Table: roles
-- Purpose: Role definitions for flexible permission system
-- Note: Replaces ENUM for extensibility (allows custom roles)
-- ----------------------------------------------------------------------------
create table app.roles (
  id serial primary key,
  name text unique not null
);

comment on table app.roles is 'Role definitions for user permissions (admin, user, etc.)';
comment on column app.roles.id is 'Primary key';
comment on column app.roles.name is 'Role name (e.g., admin, user)';

-- Insert default roles
insert into app.roles (name) values ('admin'), ('user')
on conflict (name) do nothing;

-- ----------------------------------------------------------------------------
-- Table: user_roles
-- Purpose: Many-to-many relationship between users and roles
-- ----------------------------------------------------------------------------
create table app.user_roles (
  user_id uuid not null references app.users(id) on delete cascade,
  role_id integer not null references app.roles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

comment on table app.user_roles is 'Many-to-many relationship between users and roles';
comment on column app.user_roles.user_id is 'Reference to user';
comment on column app.user_roles.role_id is 'Reference to role';
comment on column app.user_roles.granted_at is 'Timestamp when role was granted';

-- ----------------------------------------------------------------------------
-- Table: peers
-- Purpose: WireGuard peer configurations
-- ----------------------------------------------------------------------------
create table app.peers (
  id uuid primary key default uuid_generate_v4(),
  public_key text unique not null,
  owner_id uuid references app.users(id) on delete restrict,
  status app.peer_status_enum not null default 'available',
  friendly_name varchar(63),
  config_ciphertext bytea not null,
  imported_at timestamptz not null,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint peers_friendly_name_format check (
    friendly_name is null or friendly_name ~ '^[a-z0-9-]+$'
  ),
  constraint peers_friendly_name_unique unique (owner_id, friendly_name)
);

comment on table app.peers is 'WireGuard peer configurations';
comment on column app.peers.id is 'Primary key';
comment on column app.peers.public_key is 'WireGuard public key (unique identifier)';
comment on column app.peers.owner_id is 'User who owns this peer (null if available)';
comment on column app.peers.status is 'Peer status (available/active/inactive)';
comment on column app.peers.friendly_name is 'User-assigned friendly name (lowercase alphanumeric and hyphens only)';
comment on column app.peers.config_ciphertext is 'Encrypted WireGuard configuration blob';
comment on column app.peers.imported_at is 'Timestamp when peer was imported';
comment on column app.peers.claimed_at is 'Timestamp when peer was claimed by user';
comment on column app.peers.revoked_at is 'Timestamp when peer was revoked';
comment on column app.peers.created_at is 'Record creation timestamp';
comment on column app.peers.updated_at is 'Last update timestamp';

-- ----------------------------------------------------------------------------
-- Table: audit_log
-- Purpose: Comprehensive audit trail of system events
-- ----------------------------------------------------------------------------
create table app.audit_log (
  id bigserial primary key,
  event_type app.audit_event_enum not null,
  actor_id uuid references app.users(id) on delete set null,
  subject_table text not null,
  subject_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table app.audit_log is 'Audit trail of all system events';
comment on column app.audit_log.id is 'Primary key';
comment on column app.audit_log.event_type is 'Type of event that occurred';
comment on column app.audit_log.actor_id is 'User who performed the action (null if system)';
comment on column app.audit_log.subject_table is 'Table name where the event occurred';
comment on column app.audit_log.subject_id is 'ID of the affected record';
comment on column app.audit_log.metadata is 'Additional event details as JSON';
comment on column app.audit_log.created_at is 'Event timestamp';

-- ----------------------------------------------------------------------------
-- Table: accepted_domains
-- Purpose: Email domains allowed for user registration
-- ----------------------------------------------------------------------------
create table app.accepted_domains (
  domain text primary key,
  created_at timestamptz not null default now()
);

comment on table app.accepted_domains is 'Email domains allowed for user registration';
comment on column app.accepted_domains.domain is 'Domain pattern (e.g., example.com, *.corp)';
comment on column app.accepted_domains.created_at is 'When domain was added';

-- ----------------------------------------------------------------------------
-- Table: user_limit_history
-- Purpose: History of changes to user peer limits
-- ----------------------------------------------------------------------------
create table app.user_limit_history (
  id bigserial primary key,
  user_id uuid not null references app.users(id) on delete cascade,
  old_limit integer not null,
  new_limit integer not null,
  changed_by uuid references app.users(id),
  changed_at timestamptz not null default now()
);

comment on table app.user_limit_history is 'History of user peer limit changes';
comment on column app.user_limit_history.id is 'Primary key';
comment on column app.user_limit_history.user_id is 'User whose limit was changed';
comment on column app.user_limit_history.old_limit is 'Previous limit value';
comment on column app.user_limit_history.new_limit is 'New limit value';
comment on column app.user_limit_history.changed_by is 'User who made the change (null if system)';
comment on column app.user_limit_history.changed_at is 'Timestamp of change';

-- ----------------------------------------------------------------------------
-- Table: password_reset_tokens
-- Purpose: Password reset token storage
-- ----------------------------------------------------------------------------
create table app.password_reset_tokens (
  token uuid primary key,
  user_id uuid not null references app.users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table app.password_reset_tokens is 'Password reset tokens for users';
comment on column app.password_reset_tokens.token is 'Unique reset token';
comment on column app.password_reset_tokens.user_id is 'User requesting password reset';
comment on column app.password_reset_tokens.expires_at is 'Token expiration timestamp';
comment on column app.password_reset_tokens.revoked_at is 'Timestamp when token was revoked (null if active)';
comment on column app.password_reset_tokens.created_at is 'Token creation timestamp';

-- ----------------------------------------------------------------------------
-- Table: import_batches
-- Purpose: Batch tracking for peer imports (optional, for reporting)
-- ----------------------------------------------------------------------------
create table app.import_batches (
  id uuid primary key default uuid_generate_v4(),
  imported_by uuid references app.users(id),
  files_imported integer not null,
  created_at timestamptz not null default now()
);

comment on table app.import_batches is 'Batch tracking for peer configuration imports';
comment on column app.import_batches.id is 'Primary key';
comment on column app.import_batches.imported_by is 'User who performed the import';
comment on column app.import_batches.files_imported is 'Number of files imported in this batch';
comment on column app.import_batches.created_at is 'Import timestamp';

-- ----------------------------------------------------------------------------
-- Step 5: Create indexes for performance
-- ----------------------------------------------------------------------------

-- audit_log indexes
-- Index for filtering by event type and time range
create index idx_audit_log_event_type_created_at on app.audit_log (event_type, created_at);

-- Index for filtering by actor and time range
create index idx_audit_log_actor_created_at_desc on app.audit_log (actor_id, created_at desc);

-- peers indexes
-- Index for finding peers by owner and status
create index idx_peers_owner_status on app.peers (owner_id, status);

-- Index for finding available peers by import order (FIFO)
create index idx_peers_status_imported_at on app.peers (status, imported_at);

-- Index for text search on friendly_name using trigrams
create index idx_peers_friendly_name_trgm on app.peers using gin (friendly_name gin_trgm_ops);

-- users indexes
-- Email is already unique, but explicit index for clarity
-- Note: Unique constraint already creates an index, but we document it here

-- user_limit_history indexes
-- Index for user limit change history queries
create index idx_user_limit_history_user_changed_at_desc on app.user_limit_history (user_id, changed_at desc);

-- ----------------------------------------------------------------------------
-- Step 6: Create function for updated_at trigger
-- ----------------------------------------------------------------------------
-- Generic function to update updated_at column on any table
create or replace function app.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

comment on function app.update_updated_at_column() is 'Trigger function to automatically update updated_at timestamp';

-- ----------------------------------------------------------------------------
-- Step 7: Create triggers for updated_at columns
-- ----------------------------------------------------------------------------

-- Trigger for users.updated_at
create trigger trigger_users_updated_at
  before update on app.users
  for each row
  execute function app.update_updated_at_column();

-- Trigger for peers.updated_at
create trigger trigger_peers_updated_at
  before update on app.peers
  for each row
  execute function app.update_updated_at_column();

-- Trigger for config_kv.updated_at
create trigger trigger_config_kv_updated_at
  before update on app.config_kv
  for each row
  execute function app.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Step 8: Enable Row Level Security (RLS) on all tables
-- ----------------------------------------------------------------------------
-- All tables use deny-by-default policy

alter table app.users enable row level security;
alter table app.roles enable row level security;
alter table app.user_roles enable row level security;
alter table app.peers enable row level security;
alter table app.audit_log enable row level security;
alter table app.accepted_domains enable row level security;
alter table app.config_kv enable row level security;
alter table app.user_limit_history enable row level security;
alter table app.password_reset_tokens enable row level security;
alter table app.import_batches enable row level security;

-- ----------------------------------------------------------------------------
-- Step 9: Create RLS Policies
-- ----------------------------------------------------------------------------
-- Note: Policies are granular - one policy per operation (select, insert, update, delete)
--       and per role (anon, authenticated) where applicable

-- ----------------------------------------------------------------------------
-- RLS Policies for app.users
-- ----------------------------------------------------------------------------

-- authenticated users can read their own user record
create policy users_authenticated_select_own on app.users
  for select
  to authenticated
  using (id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- authenticated users can update their own email (if needed)
create policy users_authenticated_update_own on app.users
  for update
  to authenticated
  using (id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid)
  with check (id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- admins can read all users
create policy users_admin_select_all on app.users
  for select
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- admins can update all users
create policy users_admin_update_all on app.users
  for update
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- admins can insert users (for user creation)
create policy users_admin_insert on app.users
  for insert
  to authenticated
  with check (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies for app.roles
-- ----------------------------------------------------------------------------

-- authenticated users can read all roles (for UI display)
create policy roles_authenticated_select_all on app.roles
  for select
  to authenticated
  using (true);

-- admins can manage roles
create policy roles_admin_all on app.roles
  for all
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies for app.user_roles
-- ----------------------------------------------------------------------------

-- authenticated users can read their own roles
create policy user_roles_authenticated_select_own on app.user_roles
  for select
  to authenticated
  using (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- admins can read all user roles
create policy user_roles_admin_select_all on app.user_roles
  for select
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- admins can manage user roles
create policy user_roles_admin_all on app.user_roles
  for all
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies for app.peers
-- ----------------------------------------------------------------------------

-- authenticated users can read their own peers
create policy peers_authenticated_select_own on app.peers
  for select
  to authenticated
  using (owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- authenticated users can read available peers (for claiming)
create policy peers_authenticated_select_available on app.peers
  for select
  to authenticated
  using (status = 'available' and owner_id is null);

-- authenticated users can update their own peers (friendly_name, revoke)
create policy peers_authenticated_update_own on app.peers
  for update
  to authenticated
  using (owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid)
  with check (
    owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
    and (status = 'inactive' or friendly_name is not null)
  );

-- admins can read all peers
create policy peers_admin_select_all on app.peers
  for select
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- admins have full access to peers
create policy peers_admin_all on app.peers
  for all
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies for app.audit_log
-- ----------------------------------------------------------------------------

-- authenticated users can read their own audit log entries
create policy audit_log_authenticated_select_own on app.audit_log
  for select
  to authenticated
  using (actor_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- admins can read all audit log entries
create policy audit_log_admin_select_all on app.audit_log
  for select
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- authenticated users can insert audit log entries (for their own actions)
create policy audit_log_authenticated_insert on app.audit_log
  for insert
  to authenticated
  with check (actor_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- admins can insert audit log entries (for any action)
create policy audit_log_admin_insert on app.audit_log
  for insert
  to authenticated
  with check (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies for app.accepted_domains
-- ----------------------------------------------------------------------------

-- authenticated users can read accepted domains (for registration validation)
create policy accepted_domains_authenticated_select_all on app.accepted_domains
  for select
  to authenticated
  using (true);

-- anon users can read accepted domains (for registration validation)
create policy accepted_domains_anon_select_all on app.accepted_domains
  for select
  to anon
  using (true);

-- admins can manage accepted domains
create policy accepted_domains_admin_all on app.accepted_domains
  for all
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies for app.config_kv
-- ----------------------------------------------------------------------------

-- admins can read configuration
create policy config_kv_admin_select_all on app.config_kv
  for select
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- admins can manage configuration
create policy config_kv_admin_all on app.config_kv
  for all
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies for app.user_limit_history
-- ----------------------------------------------------------------------------

-- authenticated users can read their own limit history
create policy user_limit_history_authenticated_select_own on app.user_limit_history
  for select
  to authenticated
  using (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- admins can read all limit history
create policy user_limit_history_admin_select_all on app.user_limit_history
  for select
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- authenticated users can insert limit history (for their own changes)
create policy user_limit_history_authenticated_insert on app.user_limit_history
  for insert
  to authenticated
  with check (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- admins can insert limit history (for any user)
create policy user_limit_history_admin_insert on app.user_limit_history
  for insert
  to authenticated
  with check (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies for app.password_reset_tokens
-- ----------------------------------------------------------------------------

-- authenticated users can read their own reset tokens
create policy password_reset_tokens_authenticated_select_own on app.password_reset_tokens
  for select
  to authenticated
  using (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- authenticated users can insert their own reset tokens
create policy password_reset_tokens_authenticated_insert on app.password_reset_tokens
  for insert
  to authenticated
  with check (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- authenticated users can update their own reset tokens (for revocation)
create policy password_reset_tokens_authenticated_update_own on app.password_reset_tokens
  for update
  to authenticated
  using (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid)
  with check (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- admins can read all reset tokens
create policy password_reset_tokens_admin_select_all on app.password_reset_tokens
  for select
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- admins can manage all reset tokens
create policy password_reset_tokens_admin_all on app.password_reset_tokens
  for all
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies for app.import_batches
-- ----------------------------------------------------------------------------

-- authenticated users can read their own import batches
create policy import_batches_authenticated_select_own on app.import_batches
  for select
  to authenticated
  using (imported_by = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- authenticated users can insert their own import batches
create policy import_batches_authenticated_insert_own on app.import_batches
  for insert
  to authenticated
  with check (imported_by = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

-- admins can read all import batches
create policy import_batches_admin_select_all on app.import_batches
  for select
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- admins can manage all import batches
create policy import_batches_admin_all on app.import_batches
  for all
  to authenticated
  using (
    exists (
      select 1 from app.user_roles ur
      join app.roles r on ur.role_id = r.id
      where ur.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and r.name = 'admin'
    )
  );

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- All tables, indexes, triggers, and RLS policies have been created.
-- The database schema is now ready for use.
-- 
-- Next steps:
-- 1. Create initial admin user via Supabase Auth
-- 2. Assign 'admin' role to admin user via user_roles table
-- 3. Configure accepted_domains for your organization
-- 4. Set default_peer_limit in config_kv if different from 10
-- ============================================================================

