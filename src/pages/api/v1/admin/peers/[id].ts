/**
 * DELETE /api/v1/admin/peers/{id}
 * Admin revoke peer
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { revokePeer } from "@/lib/services/peerService";
import { getSupabaseAdminClient } from "@/db/supabase.client";

export const prerender = false;

const IdParamSchema = z.uuid();

export const DELETE: APIRoute = async ({ params, locals }) => {
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

    // Validate path parameter
    const parseResult = IdParamSchema.safeParse(params.id);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "InvalidId",
          message: "Invalid peer ID format",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const peerId = parseResult.data;

    // Revoke peer using admin client to bypass RLS
    await revokePeer(getSupabaseAdminClient(), peerId, locals.user.id);

    // Return 204 No Content
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error revoking peer (admin):", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === "NotFound") {
        return new Response(
          JSON.stringify({
            error: "NotFound",
            message: "Peer not found",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Generic error
    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to revoke peer",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

