/**
 * POST /api/v1/admin/peers/{id}/assign
 * Manually assign peer to user (admin only)
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { assignPeerToUser } from "@/lib/services/peerService";

export const prerender = false;

const IdParamSchema = z.uuid();

const AssignPeerSchema = z.object({
  user_id: z.uuid(),
});

export const POST: APIRoute = async ({ params, request, locals }) => {
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

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Invalid JSON body",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const bodyParseResult = AssignPeerSchema.safeParse(body);
    if (!bodyParseResult.success) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Invalid request body",
          details: bodyParseResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { user_id } = bodyParseResult.data;

    // Assign peer to user
    const peer = await assignPeerToUser(locals.supabase, peerId, user_id);

    // Return assigned peer
    return new Response(JSON.stringify(peer), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error assigning peer:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === "LimitExceeded") {
        return new Response(
          JSON.stringify({
            error: "LimitExceeded",
            message: "Target user has reached peer limit",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (error.message === "UserNotFound") {
        return new Response(
          JSON.stringify({
            error: "NotFound",
            message: "Target user not found",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      if (error.message === "PeerNotFound") {
        return new Response(
          JSON.stringify({
            error: "NotFound",
            message: "Peer not found",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      if (error.message === "PeerNotAvailable") {
        return new Response(
          JSON.stringify({
            error: "ValidationError",
            message: "Peer is not available for assignment",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Generic error
    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to assign peer",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

