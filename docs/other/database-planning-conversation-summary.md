# Database Planning Conversation Summary

This document provides a high-level summary of key decisions made during database schema planning. For the complete, detailed database schema specification, see [db-plan.md](../../db-plan.md).

## Key Decisions

- **Primary Keys**: All tables use UUID primary keys compatible with `auth.users.id`
- **Peer-User Relationship**: One-to-one relationship; `owner_id` column in `peers` with `ON DELETE RESTRICT`
- **Status Types**: Peer statuses (Available, Active, Inactive) and user statuses (Active, Inactive) implemented as ENUM types
- **Configuration Storage**: Encrypted configuration files stored in `peers.config_ciphertext` (bytea) using Supabase Secrets
- **Domain Validation**: `accepted_domains` table in `app` schema, editable by admins; wildcard validation handled in application logic
- **FIFO Peer Assignment**: Implemented using `SELECT … ORDER BY imported_at LIMIT 1 FOR UPDATE SKIP LOCKED`
- **Friendly Names**: Unique per owner: `UNIQUE(owner_id, friendly_name)` with `VARCHAR(63)` and regex CHECK constraint
- **User Deactivation**: Database trigger sets `peers.status = 'Inactive'` and `revoked_at` when user is deactivated
- **Limit History**: Separate `user_limit_history` table tracks changes to `peer_limit`; current limit stored in `users.peer_limit`
- **Roles & Permissions**: Application tables in `app` schema; `app_backend` role for service; RLS on `config_kv` and `audit_log`
- **Password Reset**: `password_reset_tokens` table (UUID token, user_id, expires_at, revoked_at) handles temporary passwords
- **Timestamps**: All timestamps stored as `TIMESTAMPTZ` in UTC; `created_at`, `updated_at`, `claimed_at`, `revoked_at` set by triggers
- **Indexes**: Key indexes on `audit_log` (event_type, created_at) and (actor_id, created_at DESC), `peers` (owner_id, status)
- **Extensions**: `uuid-ossp`, `pgcrypto`, `pg_trgm` installed in first migration
- **Naming Convention**: snake_case, plural table names, `<table>_<columns>_<type>` pattern for indexes/constraints

## Architecture Overview

The database schema is organized into the `app` schema, separate from Supabase's default `public` schema. Key components include:

- **User Management**: Synchronized with Supabase Auth via triggers
- **Role-Based Access**: Flexible role system using `roles` and `user_roles` tables
- **Peer Management**: Full lifecycle management (import, claim, assign, download, revoke)
- **Audit Trail**: Comprehensive event logging in `audit_log` table
- **Security**: Row Level Security (RLS) policies enforce access control with "deny by default" approach

## Implementation Status

The database schema has been implemented via Supabase migrations:
- `20241219120000_initial_schema.sql` - Creates all tables, indexes, triggers, and RLS policies
- `20241219120100_sync_auth_users.sql` - Sets up synchronization between `auth.users` and `app.users`

For detailed table structures, relationships, indexes, and RLS policies, refer to [db-plan.md](../../db-plan.md).

## Related Documentation

- [Database Schema Plan](../../db-plan.md) - Complete database schema specification
- [Database Migrations Plan](./db-migrations-plan.md) - Migration strategy and planning
