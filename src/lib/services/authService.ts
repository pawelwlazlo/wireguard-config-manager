/**
 * Auth Service
 * Business logic for authentication and authorization
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@/db/supabase.client";
import type { Database, Tables } from "@/db/database.types";
import type { UserDto, RoleName, AuthResponse } from "@/types";

type UserRow = Tables<{ schema: "app" }, "users">;
type RoleRow = Tables<{ schema: "app" }, "roles">;

/**
 * In-memory cache for accepted domains
 * Cache expires after 5 minutes
 */
let acceptedDomainsCache: string[] | null = null;
let acceptedDomainsCacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Create an authenticated Supabase client with JWT token
 * This is needed for operations that require authentication context
 * (e.g., fetching user profile with RLS after signup/login)
 */
function createAuthenticatedClient(jwt: string): SupabaseClient {
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
    auth: {
      persistSession: false, // Don't persist in this temporary client
    },
  });
}

/**
 * Get accepted email domains from database with caching
 */
async function getAcceptedDomains(supabase: SupabaseClient): Promise<string[]> {
  const now = Date.now();

  // Return cached value if still valid
  if (acceptedDomainsCache && now - acceptedDomainsCacheTime < CACHE_TTL) {
    return acceptedDomainsCache;
  }

  // Fetch from database
  const { data, error } = await supabase
    .schema("app")
    .from("accepted_domains")
    .select("domain");

  if (error) {
    console.error("Error fetching accepted domains:", error);
    throw new Error("DatabaseError");
  }

  // Update cache
  acceptedDomainsCache = (data || []).map((row) => row.domain);
  acceptedDomainsCacheTime = now;

  return acceptedDomainsCache;
}

/**
 * Validate if email domain is accepted
 */
export async function validateEmailDomain(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) {
    return false;
  }

  const acceptedDomains = await getAcceptedDomains(supabase);
  return acceptedDomains.includes(domain);
}

/**
 * Map database row to UserDto with roles
 */
function mapToUserDto(
  row: Pick<UserRow, "id" | "email" | "status" | "peer_limit" | "created_at">,
  roles: RoleName[]
): UserDto {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    peer_limit: row.peer_limit,
    created_at: row.created_at,
    roles,
  };
}

/**
 * Get user profile by user ID with roles
 * Returns null if user not found
 */
async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserDto | null> {
  // Get user data
  const { data: user, error: userError } = await supabase
    .schema("app")
    .from("users")
    .select("id, email, status, peer_limit, created_at")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return null;
  }

  // Get user roles
  const { data: userRoles, error: rolesError } = await supabase
    .schema("app")
    .from("user_roles")
    .select("role_id, roles!inner(name)")
    .eq("user_id", userId);

  if (rolesError) {
    return null;
  }

  // Extract role names from the join result
  const roles: RoleName[] = (userRoles || []).map(
    (ur) => (ur.roles as unknown as RoleRow).name
  );

  return mapToUserDto(user, roles);
}

/**
 * Log audit event
 */
async function logAuditEvent(
  supabase: SupabaseClient,
  eventType: "LOGIN",
  actorId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabase.schema("app").from("audit_log").insert({
    event_type: eventType,
    actor_id: actorId,
    subject_table: "users",
    subject_id: actorId,
    metadata: metadata || {},
  });
}

/**
 * Register a new user with email/password
 * Validates email domain against accepted_domains table
 * First user becomes admin automatically, subsequent users become regular users
 * 
 * @throws "InvalidDomain" if email domain not in accepted_domains
 * @throws "EmailExists" if email already registered
 * @throws "WeakPassword" if password doesn't meet requirements
 * @throws "AuthError" for other Supabase auth errors
 */
export async function registerUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<AuthResponse> {
  // Validate email domain
  const isValidDomain = await validateEmailDomain(supabase, email);
  if (!isValidDomain) {
    throw new Error("InvalidDomain");
  }

  // Validate password strength (basic check, Supabase has its own validation)
  if (password.length < 8) {
    throw new Error("WeakPassword");
  }

  // Check if this will be the first user (for admin role assignment)
  const { count: userCount, error: countError } = await supabase
    .schema("app")
    .from("users")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Error checking user count:", countError);
    throw new Error("AuthError");
  }

  const isFirstUser = (userCount || 0) === 0;

  // Register with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    // Check for duplicate email (Supabase error code)
    if (authError.message.includes("already registered")) {
      throw new Error("EmailExists");
    }
    // Check for weak password
    if (authError.message.includes("password")) {
      throw new Error("WeakPassword");
    }
    console.error("Supabase auth signup error:", authError);
    throw new Error("AuthError");
  }

  if (!authData.user || !authData.session) {
    throw new Error("AuthError");
  }

  const userId = authData.user.id;
  const jwt = authData.session.access_token;

  // Create authenticated client for RLS-protected operations
  const authenticatedClient = createAuthenticatedClient(jwt);

  // Assign role to user (admin if first user, otherwise regular user)
  // Note: The sync_user_from_auth trigger has already created the user record
  const roleName = isFirstUser ? "admin" : "user";

  const { data: roleData, error: roleError } = await authenticatedClient
    .schema("app")
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !roleData) {
    console.error("Error fetching role:", roleError);
    throw new Error("AuthError");
  }

  const { error: assignRoleError } = await authenticatedClient
    .schema("app")
    .from("user_roles")
    .insert({
      user_id: userId,
      role_id: roleData.id,
    });

  if (assignRoleError) {
    console.error("Error assigning role:", assignRoleError);
    throw new Error("AuthError");
  }

  // Get user profile with roles using authenticated client
  const userProfile = await getUserProfile(authenticatedClient, userId);
  if (!userProfile) {
    throw new Error("AuthError");
  }

  // Log audit event using anon client (we have RLS policy for this)
  await logAuditEvent(supabase, "LOGIN", userId, { action: "register" });

  return {
    jwt,
    user: userProfile,
  };
}

/**
 * Login user with email/password
 * 
 * @throws "InvalidCredentials" if email or password incorrect
 * @throws "TooManyAttempts" if rate limited by Supabase
 * @throws "AuthError" for other authentication errors
 */
export async function loginUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<AuthResponse> {
  // Sign in with Supabase Auth
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    // Check for invalid credentials
    if (
      authError.message.includes("Invalid login credentials") ||
      authError.message.includes("Email not confirmed")
    ) {
      throw new Error("InvalidCredentials");
    }
    // Check for rate limiting
    if (authError.message.includes("too many")) {
      throw new Error("TooManyAttempts");
    }
    console.error("Supabase auth signin error:", authError);
    throw new Error("AuthError");
  }

  if (!authData.user || !authData.session) {
    throw new Error("InvalidCredentials");
  }

  const userId = authData.user.id;
  const jwt = authData.session.access_token;

  // Create authenticated client for RLS-protected operations
  const authenticatedClient = createAuthenticatedClient(jwt);

  // Get user profile with roles using authenticated client
  const userProfile = await getUserProfile(authenticatedClient, userId);
  if (!userProfile) {
    throw new Error("AuthError");
  }

  // Log audit event using anon client (we have RLS policy for this)
  await logAuditEvent(supabase, "LOGIN", userId, { action: "login" });

  return {
    jwt,
    user: userProfile,
  };
}

/**
 * Logout user by invalidating their session
 * 
 * @throws "AuthError" if logout fails
 */
export async function logoutUser(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  // Sign out from Supabase Auth
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Supabase auth signout error:", error);
    throw new Error("AuthError");
  }

  // Log audit event
  await logAuditEvent(supabase, "LOGIN", userId, { action: "logout" });
}

