/**
 * POST /api/v1/peers/claim
 * Automatically claim next available peer (FIFO)
 */

import type { APIRoute } from "astro";
import { claimNextPeer } from "@/lib/services/peerService";
import { getSupabaseAdminClient } from "@/db/supabase.client";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use admin client for admins to avoid RLS recursion, regular client for users
    const client = locals.user.roles.includes('admin') 
      ? getSupabaseAdminClient() 
      : locals.supabase;

    // Claim next available peer
    const peer = await claimNextPeer(client, locals.user.id);

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

