/**
 * GET /api/v1/admin/peers
 * Global list of all peers with filtering and pagination (admin only)
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { getPeersAdmin } from "@/lib/services/peerService";
import type { Page, PeerDto } from "@/types";

export const prerender = false;

const QuerySchema = z.object({
  status: z.enum(["available", "active", "inactive"]).optional(),
  owner: z.uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  size: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // TODO: Check if user is admin (when auth is implemented)
    // if (!locals.user || !isAdmin(locals.user)) {
    //   return forbidden("Admin access required");
    // }

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

    // Fetch all peers with filters
    const result = await getPeersAdmin(locals.supabase, {
      status,
      ownerId: owner,
      page,
      size,
    });

    // Build Page<PeerDto> response
    const response: Page<PeerDto> = {
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

