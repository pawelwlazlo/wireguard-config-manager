-- Fix infinite recursion in RLS policies for user_roles and peers
-- The problem: policies check user_roles to determine if user is admin,
-- which creates infinite recursion when those same policies protect user_roles table.

-- Solution: Create a security definer function that bypasses RLS to check admin status

-- Drop existing problematic policies
drop policy if exists user_roles_admin_select_all on app.user_roles;
drop policy if exists user_roles_admin_all on app.user_roles;
drop policy if exists peers_admin_select_all on app.peers;
drop policy if exists peers_admin_all on app.peers;
drop policy if exists roles_admin_all on app.roles;
drop policy if exists users_admin_select_all on app.users;
drop policy if exists users_admin_update_all on app.users;
drop policy if exists users_admin_insert on app.users;
drop policy if exists audit_log_admin_select_all on app.audit_log;
drop policy if exists audit_log_admin_insert on app.audit_log;

-- Create a security definer function to check if user is admin
-- This function runs with elevated privileges and bypasses RLS
create or replace function app.is_admin(user_id uuid)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return exists (
    select 1
    from app.user_roles ur
    join app.roles r on ur.role_id = r.id
    where ur.user_id = is_admin.user_id
    and r.name = 'admin'
  );
end;
$$;

comment on function app.is_admin is 'Check if user has admin role (bypasses RLS to avoid recursion)';

-- Grant execute permission to authenticated users
grant execute on function app.is_admin(uuid) to authenticated;

-- Recreate policies using the security definer function

-- app.user_roles policies
create policy user_roles_admin_select_all on app.user_roles
  for select
  to authenticated
  using (app.is_admin((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid));

create policy user_roles_admin_all on app.user_roles
  for all
  to authenticated
  using (app.is_admin((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid));

-- app.roles policies
create policy roles_admin_all on app.roles
  for all
  to authenticated
  using (app.is_admin((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid));

-- app.peers policies
create policy peers_admin_select_all on app.peers
  for select
  to authenticated
  using (app.is_admin((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid));

create policy peers_admin_all on app.peers
  for all
  to authenticated
  using (app.is_admin((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid));

-- app.users policies
create policy users_admin_select_all on app.users
  for select
  to authenticated
  using (app.is_admin((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid));

create policy users_admin_update_all on app.users
  for update
  to authenticated
  using (app.is_admin((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid));

create policy users_admin_insert on app.users
  for insert
  to authenticated
  with check (app.is_admin((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid));

-- app.audit_log policies
create policy audit_log_admin_select_all on app.audit_log
  for select
  to authenticated
  using (app.is_admin((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid));

create policy audit_log_admin_insert on app.audit_log
  for insert
  to authenticated
  with check (app.is_admin((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid));

