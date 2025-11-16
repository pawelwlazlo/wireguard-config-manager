-- Add RLS policy to allow authenticated users to claim available peers
-- This allows UPDATE on peers where owner_id IS NULL (available peers)
-- to set owner_id to current user (claim operation)

create policy peers_authenticated_claim_available on app.peers
  for update
  to authenticated
  using (
    -- Can update available peers (no owner)
    status = 'available' 
    and owner_id is null
  )
  with check (
    -- After update, peer must be owned by current user and active
    owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
    and status = 'active'
  );

comment on policy peers_authenticated_claim_available on app.peers is 
  'Allow authenticated users to claim available peers (set owner_id to themselves)';

