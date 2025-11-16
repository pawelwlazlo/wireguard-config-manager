/**
 * User Service
 * Business logic for user management
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { Tables } from "@/db/database.types";
import type { UserDto, UserStatus, RoleName } from "@/types";
import { logAudit } from "./auditService";

type UserRow = Tables<{ schema: "app" }, "users">;
type RoleRow = Tables<{ schema: "app" }, "roles">;

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
export async function getProfile(
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
 * Get paginated list of users (admin only)
 * Supports filtering by status, domain, and role
 */
export async function listUsers(
  supabase: SupabaseClient,
  options: {
    status?: UserStatus;
    domain?: string;
    role?: RoleName;
    page?: number;
    size?: number;
    sort?: string;
  }
): Promise<{
  items: UserDto[];
  total: number;
  page: number;
  size: number;
}> {
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const offset = (page - 1) * size;

  // Build base query
  let query = supabase
    .schema("app")
    .from("users")
    .select("id, email, status, peer_limit, created_at, requires_password_change", { count: "exact" });

  // Apply filters
  if (options.status) {
    query = query.eq("status", options.status);
  }

  if (options.domain) {
    query = query.like("email", `%@${options.domain}`);
  }

  // Apply sorting
  if (options.sort) {
    const [field, direction] = options.sort.split(":");
    const ascending = direction === "asc";
    query = query.order(field, { ascending });
  } else {
    // Default sort by created_at desc
    query = query.order("created_at", { ascending: false });
  }

  // Apply pagination
  query = query.range(offset, offset + size - 1);

  const { data: users, count, error } = await query;

  if (error || !users) {
    throw new Error("DatabaseError");
  }

  // Get roles for all users in batch
  const userIds = users.map((u) => u.id);
  const { data: userRoles, error: rolesError } = await supabase
    .schema("app")
    .from("user_roles")
    .select("user_id, role_id, roles!inner(name)")
    .in("user_id", userIds);

  if (rolesError) {
    throw new Error("DatabaseError");
  }

  // Build a map of user_id -> roles[]
  const rolesMap = new Map<string, RoleName[]>();
  (userRoles || []).forEach((ur) => {
    const userId = ur.user_id;
    const roleName = (ur.roles as unknown as RoleRow).name;
    if (!rolesMap.has(userId)) {
      rolesMap.set(userId, []);
    }
    rolesMap.get(userId)!.push(roleName);
  });

  // Filter by role if specified
  let filteredUsers = users;
  if (options.role) {
    filteredUsers = users.filter((user) => {
      const userRoles = rolesMap.get(user.id) || [];
      return userRoles.includes(options.role as RoleName);
    });
  }

  // Get peers count for all users in batch
  const { data: peersCounts, error: peersError } = await supabase
    .schema("app")
    .from("peers")
    .select("owner_id")
    .in("owner_id", userIds);

  if (peersError) {
    throw new Error("DatabaseError");
  }

  // Build a map of user_id -> peers_count
  const peersCountMap = new Map<string, number>();
  (peersCounts || []).forEach((peer) => {
    const ownerId = peer.owner_id;
    if (ownerId) {
      peersCountMap.set(ownerId, (peersCountMap.get(ownerId) || 0) + 1);
    }
  });

  // Map users to DTOs with peers_count
  const items = filteredUsers.map((user) => {
    const roles = rolesMap.get(user.id) || [];
    const dto = mapToUserDto(user, roles);
    return {
      ...dto,
      peers_count: peersCountMap.get(user.id) || 0,
    };
  });

  return {
    items,
    total: options.role ? items.length : (count || 0),
    page,
    size,
  };
}

/**
 * Update user properties (admin only)
 * Throws named errors for validation failures
 */
export async function updateUser(
  supabase: SupabaseClient,
  userId: string,
  adminId: string,
  updates: {
    peer_limit?: number;
    status?: UserStatus;
  }
): Promise<UserDto> {
  // Check if user exists and get current data
  const { data: currentUser, error: fetchError } = await supabase
    .schema("app")
    .from("users")
    .select("id, email, status, peer_limit, created_at, requires_password_change")
    .eq("id", userId)
    .single();

  if (fetchError || !currentUser) {
    throw new Error("NotFound");
  }

  // Validate peer_limit if being changed
  if (updates.peer_limit !== undefined) {
    if (updates.peer_limit < 0) {
      throw new Error("ValidationError");
    }

    // Check if new limit would be less than active peers count
    const { count: activePeersCount, error: countError } = await supabase
      .schema("app")
      .from("peers")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("status", "active");

    if (countError) {
      throw new Error("DatabaseError");
    }

    if (updates.peer_limit < (activePeersCount || 0)) {
      throw new Error("LimitExceeded");
    }

    // Record limit change in history
    await supabase.schema("app").from("user_limit_history").insert({
      user_id: userId,
      old_limit: currentUser.peer_limit,
      new_limit: updates.peer_limit,
      changed_by: adminId,
    });

    // Log audit event for limit change
    await logAudit(supabase, "LIMIT_CHANGE", adminId, "users", userId, {
      old_limit: currentUser.peer_limit,
      new_limit: updates.peer_limit,
      user_email: currentUser.email,
    });
  }

  // Log audit event if status changed to inactive
  if (updates.status === "inactive" && currentUser.status !== "inactive") {
    await logAudit(supabase, "USER_DEACTIVATE", adminId, "users", userId, {
      user_email: currentUser.email,
      old_status: currentUser.status,
      new_status: updates.status,
    });
  }

  // Update user
  const { data: updatedUser, error: updateError } = await supabase
    .schema("app")
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select("id, email, status, peer_limit, created_at, requires_password_change")
    .single();

  if (updateError || !updatedUser) {
    throw new Error("DatabaseError");
  }

  // Get user roles
  const { data: userRoles, error: rolesError } = await supabase
    .schema("app")
    .from("user_roles")
    .select("role_id, roles!inner(name)")
    .eq("user_id", userId);

  if (rolesError) {
    throw new Error("DatabaseError");
  }

  const roles: RoleName[] = (userRoles || []).map(
    (ur) => (ur.roles as unknown as RoleRow).name
  );

  return mapToUserDto(updatedUser, roles);
}

/**
 * Generate a cryptographically secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }

  return password;
}

/**
 * Reset user password (admin only)
 * Generates a temporary password and updates it via Supabase Admin API
 * 
 * @param supabase - Regular Supabase client (not admin)
 * @param supabaseAdmin - Supabase Admin client with service_role key
 * @param userId - User ID to reset password for
 * @param adminId - Admin performing the reset
 * @returns Temporary password
 */
export async function resetUserPassword(
  supabase: SupabaseClient,
  supabaseAdmin: SupabaseClient | null,
  userId: string,
  adminId: string
): Promise<string> {
  // Check if user exists
  const { data: user, error: userError } = await supabase
    .schema("app")
    .from("users")
    .select("id, email")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    throw new Error("NotFound");
  }

  // Generate secure temporary password
  const temporaryPassword = generateSecurePassword(16);

  // TODO: Implement Supabase Admin API password reset when admin client is available
  // For now, we'll just simulate the operation and log the generated password
  if (supabaseAdmin) {
    // const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    //   userId,
    //   { password: temporaryPassword }
    // );
    // if (updateError) {
    //   throw new Error("AdminAPIError");
    // }
  } else {
    console.warn(
      `[MOCK] Password reset by admin ${adminId} for user ${userId}. Temporary password: ${temporaryPassword}`
    );
  }

  // Record password reset token for audit trail
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

  await supabase.schema("app").from("password_reset_tokens").insert({
    user_id: userId,
    token: temporaryPassword, // In production, this should be hashed
    expires_at: expiresAt.toISOString(),
  });

  // Set requires_password_change flag to force user to change password on next login
  const { error: updateFlagError } = await supabase
    .schema("app")
    .from("users")
    .update({ requires_password_change: true })
    .eq("id", userId);

  if (updateFlagError) {
    console.error("Error setting requires_password_change flag:", updateFlagError);
    // Don't fail the entire operation if this update fails
  }

  // Log audit event
  await logAudit(supabase, "RESET_PASSWORD", adminId, "users", userId, {
    user_email: user.email,
    reset_by_admin: adminId,
  });

  return temporaryPassword;
}
