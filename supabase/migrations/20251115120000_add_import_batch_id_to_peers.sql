-- ============================================================================
-- WireGuard Configuration Manager - Add import_batch_id to peers table
-- ============================================================================
-- 
-- Purpose: Adds import_batch_id column to peers table to track which import
--          batch each peer configuration was imported from. This enables
--          better traceability and reporting for imported configurations.
--
-- Affected Objects:
--   - Table: app.peers (add column import_batch_id)
--   - Index: idx_peers_import_batch_id (for query performance)
--
-- Notes:
--   - Column is nullable to support peers created before this migration
--   - Foreign key constraint ensures referential integrity with import_batches
--   - Index improves query performance when filtering by batch
--   - Existing peers will have NULL import_batch_id (imported before tracking)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Step 1: Add import_batch_id column to peers table
-- ----------------------------------------------------------------------------
alter table app.peers
  add column import_batch_id uuid references app.import_batches(id) on delete set null;

comment on column app.peers.import_batch_id is 
  'Reference to import batch that imported this peer configuration. '
  'NULL for peers imported before batch tracking was implemented.';

-- ----------------------------------------------------------------------------
-- Step 2: Create index for query performance
-- ----------------------------------------------------------------------------
-- Index improves performance when querying peers by import batch
create index idx_peers_import_batch_id on app.peers (import_batch_id);

comment on index app.idx_peers_import_batch_id is 
  'Index for efficient queries filtering peers by import batch ID';

-- ----------------------------------------------------------------------------
-- Step 3: Update RLS policies (if needed)
-- ----------------------------------------------------------------------------
-- No RLS policy changes needed - existing policies cover the new column
-- The column is just a reference and doesn't affect access control logic

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- The peers table now includes import_batch_id column:
-- 
-- 1. New peers imported via /api/v1/admin/import will have batch tracking
-- 2. Existing peers will have NULL import_batch_id (historical data)
-- 3. Foreign key constraint maintains referential integrity
-- 4. Index ensures efficient batch-based queries
-- 
-- Next steps:
-- 1. Update importService.ts to include import_batch_id when inserting peers
-- 2. Regenerate TypeScript types from database schema (if using Supabase CLI)
-- 3. Test import functionality to verify batch tracking works
-- ============================================================================

