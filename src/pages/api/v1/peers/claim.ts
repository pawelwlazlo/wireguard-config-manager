/**
 * POST /api/v1/peers/claim
 * Automatically claim next available peer (FIFO)
 */

import type { APIRoute } from "astro";
import { claimNextPeer } from "@/lib/services/peerService";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    // TODO: For now, we'll use a mock user ID until auth is implemented
    // This should be replaced with: const userId = locals.user?.id
    const mockUserId = "00000000-0000-0000-0000-000000000000";

    // Claim next available peer
    const peer = await claimNextPeer(locals.supabase, mockUserId);

    // Return claimed peer
    return new Response(JSON.stringify(peer), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error claiming peer:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === "LimitExceeded") {
        return new Response(
          JSON.stringify({
            error: "LimitExceeded",
            message: "You have reached your peer limit",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (error.message === "NoAvailable") {
        return new Response(
          JSON.stringify({
            error: "NoAvailable",
            message: "No available peers to claim",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Generic error
    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to claim peer",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

