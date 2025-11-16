/**
 * Peer Service
 * Business logic for WireGuard peer management
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { Tables } from "@/db/database.types";
import type { PeerDto, PeerStatus, PeerRowVM } from "@/types";
import { logAudit } from "./auditService";

type PeerRow = Tables<{ schema: "app" }, "peers">;

/**
 * Map database row to PeerDto
 */
function mapToPeerDto(row: Pick<PeerRow, "id" | "public_key" | "status" | "friendly_name" | "claimed_at" | "revoked_at">): PeerDto {
  return {
    id: row.id,
    public_key: row.public_key,
    status: row.status,
    friendly_name: row.friendly_name,
    claimed_at: row.claimed_at,
    revoked_at: row.revoked_at,
  };
}

/**
 * Get single peer by ID
 * Returns null if not found or no access (RLS)
 */
export async function getPeerById(
  supabase: SupabaseClient,
  peerId: string
): Promise<PeerDto | null> {
  const { data, error } = await supabase
    .schema("app")
    .from("peers")
    .select("id, public_key, status, friendly_name, claimed_at, revoked_at")
    .eq("id", peerId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapToPeerDto(data);
}

/**
 * Get paginated list of peers for owner
 * RLS will filter by owner_id automatically
 */
export async function getPeersForOwner(
  supabase: SupabaseClient,
  ownerId: string,
  options: {
    status?: PeerStatus;
    page?: number;
    size?: number;
  }
): Promise<{
  items: PeerDto[];
  total: number;
  page: number;
  size: number;
}> {
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const offset = (page - 1) * size;

  let query = supabase
    .schema("app")
    .from("peers")
    .select(
      "id, public_key, status, friendly_name, claimed_at, revoked_at",
      { count: "exact" }
    )
    .eq("owner_id", ownerId)
    .order("claimed_at", { ascending: false });

  if (options.status) {
    query = query.eq("status", options.status);
  }

  query = query.range(offset, offset + size - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch peers: ${error.message}`);
  }

  return {
    items: (data || []).map(mapToPeerDto),
    total: count || 0,
    page,
    size,
  };
}

/**
 * Get count of active peers for user
 */
export async function getActivePeerCount(
  supabase: SupabaseClient,
  ownerId: string
): Promise<number> {
  const { count, error } = await supabase
    .schema("app")
    .from("peers")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to count active peers: ${error.message}`);
  }

  return count || 0;
}

/**
 * Claim next available peer (FIFO)
 */
export async function claimNextPeer(
  supabase: SupabaseClient,
  userId: string
): Promise<PeerDto> {
  // Get user's peer limit
  const { data: userData, error: userError } = await supabase
    .schema("app")
    .from("users")
    .select("peer_limit")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    throw new Error("User not found");
  }

  // Check current active peer count
  const activeCount = await getActivePeerCount(supabase, userId);

  if (activeCount >= userData.peer_limit) {
    throw new Error("LimitExceeded");
  }

  // Find next available peer (FIFO by imported_at)
  const { data: availablePeer, error: findError } = await supabase
    .schema("app")
    .from("peers")
    .select("id")
    .eq("status", "available")
    .is("owner_id", null)
    .order("imported_at", { ascending: true })
    .limit(1)
    .single();

  if (findError || !availablePeer) {
    throw new Error("NoAvailable");
  }

  // Claim the peer
  const { data, error } = await supabase
    .schema("app")
    .from("peers")
    .update({
      owner_id: userId,
      status: "active",
      claimed_at: new Date().toISOString(),
    })
    .eq("id", availablePeer.id)
    .eq("status", "available")
    .select("id, public_key, status, friendly_name, claimed_at, revoked_at")
    .single();

  if (error || !data) {
    throw new Error("Failed to claim peer");
  }

  // Log audit event
  await logAudit(supabase, "PEER_CLAIM", userId, "peers", data.id, {
    peer_id: data.id,
    public_key: data.public_key,
  });

  return mapToPeerDto(data);
}

/**
 * Update peer friendly name
 */
export async function updatePeerFriendlyName(
  supabase: SupabaseClient,
  peerId: string,
  friendlyName: string
): Promise<PeerDto> {
  // Update peer
  const { data, error } = await supabase
    .schema("app")
    .from("peers")
    .update({
      friendly_name: friendlyName,
    })
    .eq("id", peerId)
    .select("id, public_key, status, friendly_name, claimed_at, revoked_at")
    .single();

  if (error) {
    // Check for unique constraint violation (23505 is PostgreSQL unique violation code)
    if (error.code === "23505") {
      throw new Error("DuplicateName");
    }
    throw new Error(`Failed to update peer: ${error.message}`);
  }

  if (!data) {
    throw new Error("NotFound");
  }

  return mapToPeerDto(data);
}

/**
 * Revoke peer (set status to inactive)
 */
export async function revokePeer(
  supabase: SupabaseClient,
  peerId: string,
  actorId: string
): Promise<void> {
  // Get peer data before revoking for audit log
  const { data: peerData } = await supabase
    .schema("app")
    .from("peers")
    .select("id, public_key, owner_id")
    .eq("id", peerId)
    .single();

  // Update peer status to inactive
  const { error } = await supabase
    .schema("app")
    .from("peers")
    .update({
      status: "inactive",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", peerId);

  if (error) {
    // Check if peer exists - if no rows affected, peer not found or no access
    if (error.code === "PGRST116") {
      throw new Error("NotFound");
    }
    throw new Error(`Failed to revoke peer: ${error.message}`);
  }

  // Log audit event
  if (peerData) {
    await logAudit(supabase, "PEER_REVOKE", actorId, "peers", peerId, {
      peer_id: peerId,
      public_key: peerData.public_key,
      owner_id: peerData.owner_id,
    });
  }
}

/**
 * Get peer configuration for download
 * Returns config_ciphertext and peer details
 */
export async function getPeerConfig(
  supabase: SupabaseClient,
  peerId: string
): Promise<{
  config_ciphertext: string;
  friendly_name: string | null;
  public_key: string;
}> {
  const { data, error } = await supabase
    .schema("app")
    .from("peers")
    .select("config_ciphertext, friendly_name, public_key, id")
    .eq("id", peerId)
    .single();

  if (error || !data) {
    throw new Error("NotFound");
  }

  return {
    config_ciphertext: data.config_ciphertext,
    friendly_name: data.friendly_name,
    public_key: data.public_key,
  };
}

/**
 * Assign peer to user (admin only)
 * Note: Authorization check should be done in the endpoint handler
 */
export async function assignPeerToUser(
  supabase: SupabaseClient,
  peerId: string,
  targetUserId: string
): Promise<PeerDto> {
  // Get target user's peer limit
  const { data: userData, error: userError } = await supabase
    .schema("app")
    .from("users")
    .select("peer_limit")
    .eq("id", targetUserId)
    .single();

  if (userError || !userData) {
    throw new Error("UserNotFound");
  }

  // Check current active peer count for target user
  const activeCount = await getActivePeerCount(supabase, targetUserId);

  if (activeCount >= userData.peer_limit) {
    throw new Error("LimitExceeded");
  }

  // Check if peer exists and is available
  const { data: peerData, error: peerError } = await supabase
    .schema("app")
    .from("peers")
    .select("id, status")
    .eq("id", peerId)
    .single();

  if (peerError || !peerData) {
    throw new Error("PeerNotFound");
  }

  if (peerData.status !== "available" && peerData.status !== "inactive") {
    throw new Error("PeerNotAvailable");
  }

  // Assign peer to user
  const { data, error } = await supabase
    .schema("app")
    .from("peers")
    .update({
      owner_id: targetUserId,
      status: "active",
      claimed_at: new Date().toISOString(),
    })
    .eq("id", peerId)
    .select("id, public_key, status, friendly_name, claimed_at, revoked_at")
    .single();

  if (error || !data) {
    throw new Error("Failed to assign peer");
  }

  return mapToPeerDto(data);
}

/**
 * Assign peer to user with audit logging (admin only)
 * Wrapper around assignPeerToUser that logs the audit event
 * Note: Authorization check should be done in the endpoint handler
 */
export async function assignPeerToUserWithAudit(
  supabase: SupabaseClient,
  peerId: string,
  targetUserId: string,
  adminId: string
): Promise<PeerDto> {
  const peer = await assignPeerToUser(supabase, peerId, targetUserId);

  // Log audit event
  await logAudit(supabase, "PEER_ASSIGN", adminId, "peers", peerId, {
    peer_id: peerId,
    target_user_id: targetUserId,
    public_key: peer.public_key,
  });

  return peer;
}

/**
 * Get paginated list of all peers (admin only)
 * Note: Authorization check should be done in the endpoint handler
 */
export async function getPeersAdmin(
  supabase: SupabaseClient,
  options: {
    status?: PeerStatus;
    ownerId?: string;
    page?: number;
    size?: number;
  }
): Promise<{
  items: PeerRowVM[];
  total: number;
  page: number;
  size: number;
}> {
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const offset = (page - 1) * size;

  let query = supabase
    .schema("app")
    .from("peers")
    .select(
      "id, public_key, status, friendly_name, claimed_at, revoked_at, owner_id, users!peers_owner_id_fkey(email)",
      { count: "exact" }
    )
    .order("imported_at", { ascending: false });

  // Apply filters
  if (options.status) {
    query = query.eq("status", options.status);
  }

  if (options.ownerId) {
    query = query.eq("owner_id", options.ownerId);
  }

  // Apply pagination
  query = query.range(offset, offset + size - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch peers: ${error.message}`);
  }

  // Map to PeerRowVM with owner information
  const items: PeerRowVM[] = (data || []).map((row: any) => ({
    id: row.id,
    public_key: row.public_key,
    status: row.status,
    friendly_name: row.friendly_name,
    claimed_at: row.claimed_at,
    revoked_at: row.revoked_at,
    owner_id: row.owner_id,
    owner_email: row.users?.email || null,
  }));

  return {
    items,
    total: count || 0,
    page,
    size,
  };
}

