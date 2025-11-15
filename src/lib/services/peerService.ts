/**
 * Peer Service
 * Business logic for WireGuard peer management
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { Tables } from "@/db/database.types";
import type { PeerDto, PeerStatus } from "@/types";

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
  peerId: string
): Promise<void> {
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
}

