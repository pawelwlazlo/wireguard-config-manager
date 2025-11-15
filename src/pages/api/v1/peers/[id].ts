/**
 * GET /api/v1/peers/{id}
 * Get single peer details (owner or admin)
 * 
 * PATCH /api/v1/peers/{id}
 * Update peer friendly_name
 * 
 * DELETE /api/v1/peers/{id}
 * Revoke peer (owner or admin)
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { getPeerById, updatePeerFriendlyName, revokePeer } from "@/lib/services/peerService";

export const prerender = false;

const IdParamSchema = z.string().uuid();

export const GET: APIRoute = async ({ params, locals }) => {
  try {
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

    // Fetch peer (RLS will handle access control)
    const peer = await getPeerById(locals.supabase, peerId);

    if (!peer) {
      return new Response(
        JSON.stringify({
          error: "NotFound",
          message: "Peer not found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return peer data
    return new Response(JSON.stringify(peer), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching peer:", error);
    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to fetch peer",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

const UpdatePeerSchema = z.object({
  friendly_name: z
    .string()
    .min(1, "Friendly name cannot be empty")
    .max(63, "Friendly name cannot exceed 63 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Friendly name must contain only lowercase letters, numbers, and hyphens"
    ),
});

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
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

    const bodyParseResult = UpdatePeerSchema.safeParse(body);
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

    const { friendly_name } = bodyParseResult.data;

    // Update peer (RLS will handle access control)
    const peer = await updatePeerFriendlyName(
      locals.supabase,
      peerId,
      friendly_name
    );

    // Return updated peer
    return new Response(JSON.stringify(peer), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating peer:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === "DuplicateName") {
        return new Response(
          JSON.stringify({
            error: "DuplicateName",
            message: "Friendly name already in use",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }

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
        message: "Failed to update peer",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
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

    // Revoke peer (RLS will handle access control)
    await revokePeer(locals.supabase, peerId);

    // Return 204 No Content
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error revoking peer:", error);

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

