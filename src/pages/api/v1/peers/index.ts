/**
 * GET /api/v1/peers
 * List user's own peers with filtering and pagination
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { getPeersForOwner } from "@/lib/services/peerService";
import type { Page, PeerDto } from "@/types";
import { getSupabaseAdminClient } from "@/db/supabase.client";

export const prerender = false;

const QuerySchema = z.object({
  status: z.enum(["available", "active", "inactive"]).optional(),
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

    const { status, page, size } = parseResult.data;

    // Use admin client for admins to avoid RLS recursion, regular client for users
    const client = locals.user.roles.includes('admin') 
      ? getSupabaseAdminClient() 
      : locals.supabase;

    // Fetch peers for user
    const result = await getPeersForOwner(client, locals.user.id, {
      status,
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
    console.error("Error fetching peers:", error);
    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to fetch peers",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

