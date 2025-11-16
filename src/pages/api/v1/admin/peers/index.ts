/**
 * GET /api/v1/admin/peers
 * Global list of all peers with filtering and pagination (admin only)
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { getPeersAdmin } from "@/lib/services/peerService";
import type { Page, PeerRowVM } from "@/types";
import { getSupabaseAdminClient } from "@/db/supabase.client";

export const prerender = false;

const QuerySchema = z.object({
  status: z.enum(["available", "active", "inactive"]).optional(),
  owner: z.uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  size: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    if (!locals.user.roles.includes("admin")) {
      return new Response(
        JSON.stringify({ error: "Forbidden", message: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse query parameters
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const parseResult = QuerySchema.safeParse(queryParams);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Invalid query parameters",
          details: parseResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { status, owner, page, size } = parseResult.data;

    // Fetch all peers with filters using admin client to bypass RLS
    const result = await getPeersAdmin(getSupabaseAdminClient(), {
      status,
      ownerId: owner,
      page,
      size,
    });

    // Build Page<PeerRowVM> response
    const response: Page<PeerRowVM> = {
      items: result.items,
      page: result.page,
      size: result.size,
      total: result.total,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching peers (admin):", error);
    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to fetch peers",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

