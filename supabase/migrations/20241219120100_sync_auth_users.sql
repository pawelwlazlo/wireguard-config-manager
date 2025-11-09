-- ============================================================================
-- WireGuard Configuration Manager - Auth Users Synchronization Migration
-- ============================================================================
-- 
-- Purpose: Synchronizes app.users table with Supabase Auth auth.users table.
--          Automatically creates/updates app.users records when users are
--          created or updated in auth.users.
--
-- Affected Objects:
--   - Function: app.sync_user_from_auth()
--   - Trigger: sync_user_from_auth_trigger on auth.users
--   - Function: app.sync_existing_auth_users() (utility function)
--
-- Notes:
--   - This migration creates triggers that automatically sync auth.users to app.users
--   - On INSERT: Creates new app.users record with default values
--   - On UPDATE: Updates email and other fields in app.users
--   - On DELETE: Handled by foreign key constraints (ON DELETE RESTRICT/CASCADE)
--   - Includes utility function to sync existing users
--   - Requires proper permissions to access auth schema
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Step 1: Create function to sync user from auth.users to app.users
-- ----------------------------------------------------------------------------
-- This function is called by trigger when auth.users is modified
create or replace function app.sync_user_from_auth()
returns trigger as $$
declare
  user_id_val uuid;
  user_email text;
begin
  -- Determine user ID and email based on trigger operation
  if tg_op = 'DELETE' then
    user_id_val := old.id;
    user_email := old.email;
  else
    user_id_val := new.id;
    user_email := new.email;
  end if;

  -- Handle DELETE: Set user status to inactive instead of deleting
  -- Note: We don't actually delete to preserve referential integrity
  if tg_op = 'DELETE' then
    update app.users
    set status = 'inactive',
        updated_at = now()
    where id = user_id_val;
    
    return old;
  end if;

  -- Handle INSERT: Create new user record in app.users
  if tg_op = 'INSERT' then
    insert into app.users (id, email, status, peer_limit, created_at, updated_at)
    values (
      user_id_val,
      user_email,
      'active',
      10, -- default peer limit (can be overridden by config_kv later)
      coalesce(new.created_at, now()),
      coalesce(new.updated_at, now())
    )
    on conflict (id) do nothing; -- Prevent errors if record already exists
    
    return new;
  end if;

  -- Handle UPDATE: Update existing user record in app.users
  if tg_op = 'UPDATE' then
    update app.users
    set email = user_email,
        updated_at = now()
    where id = user_id_val;
    
    -- If user doesn't exist in app.users yet, create it
    if not found then
      insert into app.users (id, email, status, peer_limit, created_at, updated_at)
      values (
        user_id_val,
        user_email,
        'active',
        10,
        coalesce(new.created_at, now()),
        coalesce(new.updated_at, now())
      );
    end if;
    
    return new;
  end if;

  return null;
end;
$$ language plpgsql security definer;

comment on function app.sync_user_from_auth() is 
  'Trigger function that synchronizes auth.users changes to app.users table. '
  'Creates new users on INSERT, updates email on UPDATE, and sets status to inactive on DELETE.';

-- ----------------------------------------------------------------------------
-- Step 2: Create trigger on auth.users to sync changes
-- ----------------------------------------------------------------------------
-- This trigger fires after INSERT, UPDATE, or DELETE on auth.users
drop trigger if exists sync_user_from_auth_trigger on auth.users;

create trigger sync_user_from_auth_trigger
  after insert or update or delete on auth.users
  for each row
  execute function app.sync_user_from_auth();

-- Note: Cannot add comment on trigger in auth schema without owner permissions
-- The trigger purpose is documented in the function comment above

-- ----------------------------------------------------------------------------
-- Step 3: Create utility function to sync existing auth users
-- ----------------------------------------------------------------------------
-- This function can be called manually to sync existing users from auth.users
-- Useful for initial migration or recovery scenarios
create or replace function app.sync_existing_auth_users()
returns table (
  synced_count integer,
  skipped_count integer,
  error_count integer
) as $$
declare
  synced integer := 0;
  skipped integer := 0;
  errors integer := 0;
  auth_user_record record;
begin
  -- Loop through all users in auth.users
  for auth_user_record in
    select id, email, created_at, updated_at
    from auth.users
  loop
    begin
      -- Try to insert or update user in app.users
      insert into app.users (id, email, status, peer_limit, created_at, updated_at)
      values (
        auth_user_record.id,
        auth_user_record.email,
        'active',
        10,
        coalesce(auth_user_record.created_at, now()),
        coalesce(auth_user_record.updated_at, now())
      )
      on conflict (id) do update
      set email = excluded.email,
          updated_at = excluded.updated_at;
      
      synced := synced + 1;
    exception
      when others then
        -- Log error but continue processing other users
        errors := errors + 1;
        raise warning 'Failed to sync user %: %', auth_user_record.id, sqlerrm;
    end;
  end loop;

  return query select synced, skipped, errors;
end;
$$ language plpgsql security definer;

comment on function app.sync_existing_auth_users() is 
  'Utility function to synchronize all existing users from auth.users to app.users. '
  'Returns counts of synced, skipped, and error records. '
  'Useful for initial migration or recovery scenarios.';

-- ----------------------------------------------------------------------------
-- Step 4: Grant necessary permissions
-- ----------------------------------------------------------------------------
-- Grant execute permission on sync functions to authenticated users
-- Note: Functions use SECURITY DEFINER so they run with creator's privileges
grant execute on function app.sync_user_from_auth() to authenticated;
grant execute on function app.sync_existing_auth_users() to authenticated;

-- Admins should be able to manually trigger sync if needed
grant execute on function app.sync_existing_auth_users() to service_role;

-- ----------------------------------------------------------------------------
-- Step 5: Initial sync of existing users (if any)
-- ----------------------------------------------------------------------------
-- Automatically sync any existing users from auth.users to app.users
-- This handles the case where users existed before this migration
do $$
declare
  sync_result record;
begin
  -- Only sync if there are users in auth.users
  if exists (select 1 from auth.users limit 1) then
    select * into sync_result from app.sync_existing_auth_users();
    
    raise notice 'Initial sync completed: % synced, % skipped, % errors', 
      sync_result.synced_count, 
      sync_result.skipped_count, 
      sync_result.error_count;
  end if;
end $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- Synchronization between auth.users and app.users is now set up:
-- 
-- 1. Automatic sync via trigger:
--    - New users created in auth.users are automatically added to app.users
--    - Email updates in auth.users are synced to app.users
--    - User deletions in auth.users set status to 'inactive' in app.users
-- 
-- 2. Manual sync function:
--    - Call app.sync_existing_auth_users() to sync all existing users
--    - Useful for recovery or initial migration scenarios
-- 
-- Next steps:
-- 1. Verify that existing users (if any) were synced correctly
-- 2. Test user creation through Supabase Auth to ensure trigger works
-- 3. Monitor for any sync errors in application logs
-- ============================================================================

