/**
 * Auth Service
 * Business logic for authentication and authorization
 */

import type { SupabaseClient } from "@/db/supabase.client";
import { getSupabaseAdminClient } from "@/db/supabase.client";
import type { Tables } from "@/db/database.types";
import type { UserDto, RoleName, AuthResponse } from "@/types";
import { logAudit } from "./auditService";

type UserRow = Tables<{ schema: "app" }, "users">;
type RoleRow = Tables<{ schema: "app" }, "roles">;

/**
 * Get accepted email domains from database
 * Always fetches fresh data from database (no caching)
 */
async function getAcceptedDomains(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .schema("app")
    .from("accepted_domains")
    .select("domain");

  if (error) {
    console.error("Error fetching accepted domains:", error);
    throw new Error("DatabaseError");
  }

  return (data || []).map((row) => row.domain);
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
  row: Pick<UserRow, "id" | "email" | "status" | "peer_limit" | "created_at" | "requires_password_change">,
  roles: RoleName[]
): UserDto {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    peer_limit: row.peer_limit,
    created_at: row.created_at,
    requires_password_change: row.requires_password_change,
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
    .select("id, email, status, peer_limit, created_at, requires_password_change")
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
 * Log audit event for auth-related operations
 */
async function logAuditEvent(
  supabase: SupabaseClient,
  eventType: "LOGIN" | "PASSWORD_CHANGE",
  actorId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAudit(supabase, eventType, actorId, "users", actorId, metadata);
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
  // Use admin client to bypass RLS
  const adminClient = getSupabaseAdminClient();
  const { count: userCount, error: countError } = await adminClient
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

  // Assign role to user (admin if first user, otherwise regular user)
  // Note: The sync_user_from_auth trigger has already created the user record
  // Use admin client to bypass RLS for role assignment (administrative operation)
  const roleName = isFirstUser ? "admin" : "user";

  const { data: roleData, error: roleError } = await adminClient
    .schema("app")
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !roleData) {
    console.error("Error fetching role:", roleError);
    throw new Error("AuthError");
  }

  const { error: assignRoleError } = await adminClient
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

  // Get user profile with roles using admin client (bypass RLS during registration)
  // Note: This is safe because we're in a server-side registration flow
  const userProfile = await getUserProfile(adminClient, userId);
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

  // Get user profile with roles using admin client (bypass RLS to avoid infinite recursion)
  // Note: This is safe because user already authenticated via Supabase Auth
  const adminClient = getSupabaseAdminClient();
  const userProfile = await getUserProfile(adminClient, userId);
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

/**
 * Change user password
 * Requires the current password for verification
 * Returns a new JWT token after successful password change
 * 
 * @throws "INCORRECT_CURRENT_PASSWORD" if current password is wrong
 * @throws "WEAK_PASSWORD" if new password doesn't meet requirements
 * @throws "AuthError" for other authentication errors
 */
export async function changePassword(
  supabase: SupabaseClient,
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<string> {
  // First, verify the current password by attempting to sign in
  // Get user email from database
  const adminClient = getSupabaseAdminClient();
  const { data: userData, error: userError } = await adminClient
    .schema("app")
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    console.error("Error fetching user data:", userError);
    throw new Error("AuthError");
  }

  // Verify current password by attempting to sign in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password: currentPassword,
  });

  if (verifyError) {
    // Current password is incorrect
    if (
      verifyError.message.includes("Invalid login credentials") ||
      verifyError.message.includes("Email not confirmed")
    ) {
      throw new Error("INCORRECT_CURRENT_PASSWORD");
    }
    console.error("Error verifying current password:", verifyError);
    throw new Error("AuthError");
  }

  // Validate new password strength
  // Must be at least 12 characters with uppercase, lowercase, digit, and special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
  if (!passwordRegex.test(newPassword)) {
    throw new Error("WEAK_PASSWORD");
  }

  // Update password using Supabase Auth
  const { data: updateData, error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    if (updateError.message.includes("password")) {
      throw new Error("WEAK_PASSWORD");
    }
    console.error("Error updating password:", updateError);
    throw new Error("AuthError");
  }

  if (!updateData.user) {
    throw new Error("AuthError");
  }

  // Get new session/JWT token
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData.session) {
    console.error("Error getting new session:", sessionError);
    throw new Error("AuthError");
  }

  // Reset requires_password_change flag (use admin client to bypass RLS)
  const { error: updateFlagError } = await adminClient
    .schema("app")
    .from("users")
    .update({ requires_password_change: false })
    .eq("id", userId);

  if (updateFlagError) {
    console.error("Error resetting password change flag:", updateFlagError);
    // Don't fail the entire operation if this update fails
  }

  // Log audit event
  await logAuditEvent(supabase, "PASSWORD_CHANGE", userId, { action: "password_change" });

  return sessionData.session.access_token;
}

