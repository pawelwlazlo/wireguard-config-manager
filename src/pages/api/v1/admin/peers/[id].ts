/**
 * DELETE /api/v1/admin/peers/{id}
 * Admin revoke peer
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { revokePeer } from "@/lib/services/peerService";

export const prerender = false;

const IdParamSchema = z.uuid();

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // TODO: Check if user is admin (when auth is implemented)
    // if (!locals.user || !isAdmin(locals.user)) {
    //   return forbidden("Admin access required");
    // }

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

    // Revoke peer (admin can revoke any peer via RLS)
    await revokePeer(locals.supabase, peerId);

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

