# Database Migrations

This directory contains SQL migration files for the WireGuard Configuration Manager database schema.

## Migration Files

Migrations are executed in chronological order based on their timestamp prefix:

1. **`20241219120000_initial_schema.sql`**
   - Creates initial database schema (tables, enums, indexes, RLS policies)
   - Sets up all core tables: users, roles, peers, audit_log, etc.
   - Enables Row Level Security on all tables

2. **`20241219120100_sync_auth_users.sql`**
   - Synchronizes Supabase Auth users with app.users table
   - Creates triggers for automatic user sync
   - Provides utility function for manual sync

3. **`20251115120000_add_import_batch_id_to_peers.sql`**
   - Adds `import_batch_id` column to `peers` table
   - Enables tracking which import batch each peer came from
   - Creates index for performance optimization

## Running Migrations

### Using Supabase CLI (Recommended)

If you have [Supabase CLI](https://supabase.com/docs/guides/cli) installed:

```bash
# Apply all pending migrations to local database
supabase db push

# Apply migrations to remote/production database
supabase db push --db-url "postgresql://..."
```

### Manual Application

If you prefer to run migrations manually:

1. **Connect to your database** using psql, pgAdmin, or Supabase SQL Editor

2. **Run each migration file in order**:
   ```sql
   -- In psql or SQL editor
   \i supabase/migrations/20241219120000_initial_schema.sql
   \i supabase/migrations/20241219120100_sync_auth_users.sql
   \i supabase/migrations/20251115120000_add_import_batch_id_to_peers.sql
   ```

3. **Verify migration success**:
   ```sql
   -- Check if tables exist
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'app';
   
   -- Check if new column exists
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_schema = 'app' 
     AND table_name = 'peers' 
     AND column_name = 'import_batch_id';
   ```

## Creating New Migrations

When adding new migrations:

1. **Use timestamp naming convention**:
   ```
   YYYYMMDDHHMMSS_description.sql
   ```
   Example: `20251115120000_add_import_batch_id_to_peers.sql`

2. **Include comprehensive documentation**:
   - Purpose of the migration
   - Affected database objects
   - Any important notes or warnings

3. **Structure your migration**:
   ```sql
   -- Header comment with description
   -- Step 1: Description
   -- SQL statements
   
   -- Step 2: Description
   -- SQL statements
   
   -- Footer comment with next steps
   ```

4. **Test locally before production**:
   - Always test migrations on local/dev database first
   - Verify rollback strategy if needed
   - Check for breaking changes

## Rollback Strategy

For most migrations, rollback requires manual intervention:

1. **Document rollback steps** in migration comments if applicable
2. **For column additions**: Safe to rollback by dropping column
3. **For data migrations**: Backup data before running
4. **For RLS policy changes**: Keep old policy definitions for reference

## Best Practices

- ✅ Always backup production database before running migrations
- ✅ Test migrations in development/staging environment first
- ✅ Use transactions when possible (most DDL is transactional in PostgreSQL)
- ✅ Keep migrations idempotent where possible (use IF NOT EXISTS, IF EXISTS)
- ✅ Document any manual steps required after migration
- ❌ Never modify existing migration files after they've been applied
- ❌ Never delete migration files from version control

## Updating TypeScript Types

After applying database migrations, update TypeScript type definitions:

### Option 1: Automatic (Supabase CLI)

```bash
# Generate types from your database
supabase gen types typescript --local > src/db/database.types.ts

# Or from remote database
supabase gen types typescript --db-url "postgresql://..." > src/db/database.types.ts
```

### Option 2: Manual

Update `src/db/database.types.ts` manually to reflect database changes:
- Add new columns to `Row`, `Insert`, and `Update` types
- Add new relationships to `Relationships` array
- Add new enums to `Enums` type

## Support

For issues or questions about migrations:
- Check Supabase documentation: https://supabase.com/docs/guides/database
- Review PostgreSQL documentation for DDL syntax
- Consult the project's technical documentation

