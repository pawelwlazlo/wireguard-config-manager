# Migration: Add import_batch_id to peers table

## Status: ✅ Ready to Apply

## Overview

This migration adds the `import_batch_id` column to the `peers` table, enabling tracking of which import batch each WireGuard peer configuration originated from.

## Changes Made

### 1. Database Migration (`supabase/migrations/20251115120000_add_import_batch_id_to_peers.sql`)
- ✅ Adds `import_batch_id UUID` column to `app.peers` table
- ✅ Creates foreign key constraint to `app.import_batches(id)` with `ON DELETE SET NULL`
- ✅ Creates index `idx_peers_import_batch_id` for query performance
- ✅ Adds column comment for documentation

### 2. TypeScript Types (`src/db/database.types.ts`)
- ✅ Added `import_batch_id: string | null` to `peers.Row`
- ✅ Added `import_batch_id?: string | null` to `peers.Insert`
- ✅ Added `import_batch_id?: string | null` to `peers.Update`
- ✅ Added relationship definition for foreign key

### 3. Import Service (`src/lib/services/importService.ts`)
- ✅ Updated peer insertion to include `import_batch_id: batchId`
- ✅ Removed TODO comments

### 4. Documentation
- ✅ Created `supabase/migrations/README.md` with migration instructions
- ✅ Documented rollback strategy and best practices

## How to Apply Migration

### Option 1: Using Supabase CLI (Recommended)

```bash
# For local development database
supabase db push

# For remote/production database
supabase db push --db-url "postgresql://user:password@host:port/database"
```

### Option 2: Manual SQL Execution

1. Connect to your database using psql, pgAdmin, or Supabase SQL Editor

2. Execute the migration file:
   ```bash
   psql -U postgres -d your_database -f supabase/migrations/20251115120000_add_import_batch_id_to_peers.sql
   ```

3. Verify the migration:
   ```sql
   -- Check if column exists
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_schema = 'app' 
     AND table_name = 'peers' 
     AND column_name = 'import_batch_id';
   
   -- Check if index exists
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE schemaname = 'app' 
     AND tablename = 'peers' 
     AND indexname = 'idx_peers_import_batch_id';
   ```

## Impact Assessment

### Breaking Changes
- ❌ **None** - This is a backward-compatible change

### Existing Data
- Existing `peers` records will have `import_batch_id = NULL`
- This is expected and represents peers imported before batch tracking was implemented

### Application Code
- ✅ `importService.ts` updated to populate the new column
- ✅ Other services (`peerService.ts`, `userService.ts`) require no changes
- ✅ API endpoints require no changes

## Testing Checklist

After applying the migration:

- [ ] Verify column exists in database schema
- [ ] Verify index exists and is functional
- [ ] Test import endpoint: `POST /api/v1/admin/import`
  - [ ] New peers should have `import_batch_id` populated
  - [ ] Batch tracking should work correctly
- [ ] Verify existing functionality still works:
  - [ ] Peer claiming (`POST /api/v1/peers/claim`)
  - [ ] Peer assignment (`POST /api/v1/admin/peers/{id}/assign`)
  - [ ] Peer listing endpoints
- [ ] Check database constraints:
  - [ ] Foreign key constraint is enforced
  - [ ] NULL values are allowed
  - [ ] ON DELETE SET NULL behavior works

## Rollback Procedure

If you need to rollback this migration:

```sql
-- 1. Drop the index
DROP INDEX IF EXISTS app.idx_peers_import_batch_id;

-- 2. Drop the column (this will cascade to remove the foreign key)
ALTER TABLE app.peers DROP COLUMN IF EXISTS import_batch_id;

-- 3. Revert code changes
git revert <commit-hash>
```

⚠️ **Warning**: Rollback will lose batch tracking information for all peers imported after this migration.

## Future Enhancements

With this migration in place, you can now:

1. **Query peers by import batch**:
   ```sql
   SELECT * FROM app.peers WHERE import_batch_id = 'batch-uuid';
   ```

2. **Generate batch reports**:
   ```sql
   SELECT 
     ib.id,
     ib.created_at,
     ib.files_imported,
     COUNT(p.id) as peers_in_db
   FROM app.import_batches ib
   LEFT JOIN app.peers p ON p.import_batch_id = ib.id
   GROUP BY ib.id, ib.created_at, ib.files_imported;
   ```

3. **Add admin UI** to view import batches and their associated peers

4. **Implement batch deletion** (if needed) with proper handling of associated peers

## References

- Migration file: `supabase/migrations/20251115120000_add_import_batch_id_to_peers.sql`
- Import service: `src/lib/services/importService.ts`
- Type definitions: `src/db/database.types.ts`
- Migration guide: `supabase/migrations/README.md`

---

**Created**: 2024-11-15  
**Status**: Ready for review and deployment  
**Risk Level**: Low (backward-compatible, nullable column)

