-- =================================================================
--      WireGuard Config Manager - Database Schema (PostgreSQL)
-- =================================================================
-- This script sets up the entire database schema for the application,
-- including custom types, tables, relationships, business logic via
-- functions and triggers, and security policies (RLS) for Supabase.
-- =================================================================

BEGIN;

-- =================================================================
-- 1. Custom Data Types (ENUMs)
-- =================================================================
-- WHAT: Defines custom enumeration types.
-- WHY:  Using ENUMs instead of plain text enforces data consistency and integrity
--       across the application, preventing invalid states and typos.

CREATE TYPE public.user_role AS ENUM ('ADMIN', 'USER');
CREATE TYPE public.user_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE public.peer_status AS ENUM ('AVAILABLE', 'ACTIVE', 'INACTIVE');
CREATE TYPE public.audit_event_type AS ENUM (
    'USER_LOGIN',           -- User successfully logged in (logged by app)
    'USER_REGISTER',        -- A new user has registered
    'USER_DEACTIVATE',      -- An admin deactivated a user's account
    'PEER_CLAIM',           -- A user claimed a new peer configuration
    'PEER_ASSIGN',          -- An admin assigned a peer to a user
    'PEER_DOWNLOAD',        -- A user downloaded their peer configuration (logged by app)
    'PEER_REVOKE',          -- A peer was revoked by a user or admin
    'PEER_IMPORT',          -- An admin imported new peers (logged by app)
    'LIMIT_CHANGE',         -- An admin changed a user's peer limit
    'PASSWORD_RESET'        -- An admin reset a user's password (logged by app)
);


-- =================================================================
-- 2. Tables
-- =================================================================

-- WHAT: Profiles Table
-- WHY:  This table extends the built-in Supabase `auth.users` table to store
--       application-specific user data like roles and limits. This separation
--       is a best practice, keeping auth concerns separate from app logic.
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'USER',
    status public.user_status NOT NULL DEFAULT 'ACTIVE',
    peer_limit smallint NOT NULL DEFAULT 5
        CONSTRAINT peer_limit_positive_check CHECK (peer_limit >= 0)
);
-- Add comments on columns for clarity in database inspection tools.
COMMENT ON TABLE public.profiles IS 'Stores application-specific user data, extending auth.users.';
COMMENT ON COLUMN public.profiles.id IS 'One-to-one relationship with auth.users.id.';
COMMENT ON COLUMN public.profiles.role IS 'Defines user permissions: ADMIN or USER.';
COMMENT ON COLUMN public.profiles.peer_limit IS 'The maximum number of active peers this user can have.';


-- WHAT: Peers Table
-- WHY:  Stores all WireGuard peer configurations. This is a central entity
--       in the application. It includes encrypted sensitive data.
CREATE TABLE public.peers (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    public_key text NOT NULL UNIQUE,
    encrypted_config text NOT NULL,
    friendly_name text
        CONSTRAINT friendly_name_format_check CHECK (friendly_name ~ '^[a-z0-9-]+$'),
    status public.peer_status NOT NULL DEFAULT 'AVAILABLE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.peers IS 'Stores all WireGuard peer configurations.';
COMMENT ON COLUMN public.peers.owner_id IS 'The user who owns this peer configuration. NULL if available.';
COMMENT ON COLUMN public.peers.public_key IS 'The unique public key of the WireGuard peer.';
COMMENT ON COLUMN public.peers.encrypted_config IS 'The full peer configuration, encrypted at the application level.';
COMMENT ON COLUMN public.peers.friendly_name IS 'A user-friendly name for the peer, used for the filename.';


-- WHAT: Audit Log Table
-- WHY:  Provides a comprehensive and immutable history of all critical
--       actions within the system, which is a key functional requirement.
CREATE TABLE public.audit_log (
    id bigserial PRIMARY KEY,
    actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type public.audit_event_type NOT NULL,
    details jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.audit_log IS 'Records all critical events for auditing purposes.';
COMMENT ON COLUMN public.audit_log.actor_user_id IS 'The user who performed the action.';
COMMENT ON COLUMN public.audit_log.details IS 'Structured (JSON) data about the event.';


-- WHAT: Settings Table
-- WHY:  A simple key-value store for non-sensitive, global application
--       configuration that needs to be readable by admins from the UI.
CREATE TABLE public.settings (
    key text PRIMARY KEY,
    value jsonb
);
COMMENT ON TABLE public.settings IS 'Stores global, non-sensitive application settings.';

-- =================================================================
-- 3. Indexes
-- =================================================================
-- WHAT: Database Indexes
-- WHY:  To improve the performance of common query operations, such as
--       finding available peers, filtering audit logs, or looking up user peers.

-- Index for finding the oldest available peer efficiently (FIFO).
CREATE INDEX idx_peers_available_fifo ON public.peers (created_at) WHERE status = 'AVAILABLE';

-- Index for quickly fetching all peers belonging to a specific user.
CREATE INDEX idx_peers_owner_id ON public.peers (owner_id);

-- Index for filtering audit logs by event type and time.
CREATE INDEX idx_audit_log_event_type_created_at ON public.audit_log (event_type, created_at);


-- =================================================================
-- 4. Helper Functions
-- =================================================================
-- WHAT: is_admin() helper function
-- WHY: This function centrally checks if the currently authenticated user has the
--      'ADMIN' role. It simplifies and standardizes permission checks,
--      especially within RLS policies. It's more secure and maintainable
--      than repeating the logic in every policy.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
    is_admin_user boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
    ) INTO is_admin_user;
    RETURN is_admin_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =================================================================
-- 5. Functions and Triggers
-- =================================================================
-- WHAT: Automated logic for handling user creation, limits, and auditing.
-- WHY:  Triggers move critical business logic into the database, ensuring it's
--       always enforced, regardless of how the data is accessed. This creates
--       a more robust and secure system.

-- HOW:  This function is triggered when a new user signs up. It creates a
--       corresponding entry in our `profiles` table. It also implements the
--       rule that the very first user automatically becomes an admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first_user boolean;
BEGIN
  -- Check if this is the first user in the profiles table
  SELECT COUNT(*) = 0 INTO is_first_user FROM public.profiles;

  -- Insert a new profile for the new user
  INSERT INTO public.profiles (id, role)
  VALUES (
    new.id,
    CASE WHEN is_first_user THEN 'ADMIN'::public.user_role ELSE 'USER'::public.user_role END
  );

  -- Log the registration event
  INSERT INTO public.audit_log (actor_user_id, event_type, details)
  VALUES (new.id, 'USER_REGISTER', jsonb_build_object('email', new.email));

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- HOW: This function runs before a peer is assigned to a user. It enforces
--      the `peer_limit`, preventing a user from having more configurations
--      than allowed. This is a critical data integrity check.
CREATE OR REPLACE FUNCTION public.check_peer_limit()
RETURNS trigger AS $$
DECLARE
    active_peers_count integer;
    user_peer_limit integer;
BEGIN
    -- This logic only applies when a peer is being assigned (owner_id is set).
    IF TG_OP = 'INSERT' AND NEW.owner_id IS NOT NULL OR
       (TG_OP = 'UPDATE' AND NEW.owner_id IS NOT NULL AND OLD.owner_id IS DISTINCT FROM NEW.owner_id) THEN

        -- Get the user's peer limit.
        SELECT peer_limit INTO user_peer_limit
        FROM public.profiles
        WHERE id = NEW.owner_id;

        -- Count the user's current active peers.
        SELECT COUNT(*) INTO active_peers_count
        FROM public.peers
        WHERE owner_id = NEW.owner_id AND status = 'ACTIVE';

        -- Check if assigning one more peer would exceed the limit.
        IF active_peers_count >= user_peer_limit THEN
            RAISE EXCEPTION 'Cannot assign peer. User has reached their peer limit of %.', user_peer_limit;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the peers table
CREATE TRIGGER before_peer_assign_check_limit
  BEFORE INSERT OR UPDATE ON public.peers
  FOR EACH ROW EXECUTE PROCEDURE public.check_peer_limit();


-- HOW: This function automatically logs changes to the `profiles` table,
--      creating a reliable audit trail for limit changes and deactivations.
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger AS $$
BEGIN
    IF OLD.peer_limit IS DISTINCT FROM NEW.peer_limit THEN
        INSERT INTO public.audit_log (actor_user_id, event_type, details)
        VALUES (
            auth.uid(),
            'LIMIT_CHANGE',
            jsonb_build_object(
                'target_user_id', NEW.id,
                'old_limit', OLD.peer_limit,
                'new_limit', NEW.peer_limit
            )
        );
    END IF;

    IF OLD.status = 'ACTIVE' AND NEW.status = 'INACTIVE' THEN
        INSERT INTO public.audit_log (actor_user_id, event_type, details)
        VALUES (
            auth.uid(),
            'USER_DEACTIVATE',
            jsonb_build_object('target_user_id', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the profiles table
CREATE TRIGGER after_profile_update_log_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.log_profile_changes();


-- HOW: When a user is deactivated, this function cascades the deactivation
--      by automatically revoking all of their active peers.
CREATE OR REPLACE FUNCTION public.deactivate_user_peers()
RETURNS trigger AS $$
BEGIN
    IF OLD.status = 'ACTIVE' AND NEW.status = 'INACTIVE' THEN
        UPDATE public.peers
        SET status = 'INACTIVE'
        WHERE owner_id = NEW.id AND status = 'ACTIVE';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the profiles table
CREATE TRIGGER after_profile_deactivate_revoke_peers
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.deactivate_user_peers();


-- HOW: This function logs key events related to peers, like being claimed or revoked.
--      It provides the database-level truth for the audit log.
CREATE OR REPLACE FUNCTION public.log_peer_changes()
RETURNS trigger AS $$
DECLARE
    event_actor_id uuid;
BEGIN
    -- Determine the actor. If the owner is the actor, use owner_id.
    -- Otherwise, it must be an admin, so use auth.uid().
    IF NEW.owner_id = auth.uid() THEN
       event_actor_id := NEW.owner_id;
    ELSE
       event_actor_id := auth.uid();
    END IF;

    -- Peer claimed or assigned
    IF (OLD.status = 'AVAILABLE' AND NEW.status = 'ACTIVE') THEN
        INSERT INTO public.audit_log (actor_user_id, event_type, details)
        VALUES (
            event_actor_id,
            -- Differentiate between a user claiming and an admin assigning
            CASE WHEN NEW.owner_id = auth.uid() THEN 'PEER_CLAIM'::public.audit_event_type ELSE 'PEER_ASSIGN'::public.audit_event_type END,
            jsonb_build_object(
                'peer_id', NEW.id,
                'assigned_to_user_id', NEW.owner_id
            )
        );
    END IF;

    -- Peer revoked
    IF (OLD.status = 'ACTIVE' AND NEW.status = 'INACTIVE') THEN
        INSERT INTO public.audit_log (actor_user_id, event_type, details)
        VALUES (
            event_actor_id,
            'PEER_REVOKE',
            jsonb_build_object(
                'peer_id', NEW.id,
                'owner_user_id', NEW.owner_id
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the peers table
CREATE TRIGGER after_peer_update_log_changes
  AFTER UPDATE ON public.peers
  FOR EACH ROW EXECUTE PROCEDURE public.log_peer_changes();

-- =================================================================
-- 6. Row Level Security (RLS)
-- =================================================================
-- WHAT: Enables RLS and defines policies.
-- WHY:  RLS is a powerful PostgreSQL feature that is central to Supabase's
--       security model. It ensures that users can only access data they are
--       authorized to see, directly at the database level.

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- --- Profiles Policies ---
CREATE POLICY "Allow users to see their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Allow admins to manage all profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --- Peers Policies ---
CREATE POLICY "Allow users to see their own peers"
  ON public.peers FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Allow users to update their own peers (friendly_name, revoke)"
  ON public.peers FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Allow admins to manage all peers"
  ON public.peers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --- Audit Log & Settings Policies ---
CREATE POLICY "Allow admins to see audit logs and settings"
  ON public.audit_log FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Allow admins to see settings"
  ON public.settings FOR SELECT
  USING (public.is_admin());


COMMIT;