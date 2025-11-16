/**
 * GET /api/v1/admin/config
 * Get system configuration key-value pairs (read-only)
 */

import type { APIRoute } from "astro";
import { getAllConfig } from "@/lib/services/configService";
import { supabaseAdminClient } from "@/db/supabase.client";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    // TODO: Check if user is authenticated and is admin (when auth is implemented)
    // if (!locals.user) {
    //   return new Response(
    //     JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
    //     { status: 401, headers: { "Content-Type": "application/json" } }
    //   );
    // }
    // if (!locals.user.roles.includes("admin")) {
    //   return new Response(
    //     JSON.stringify({ error: "Forbidden", message: "Admin access required" }),
    //     { status: 403, headers: { "Content-Type": "application/json" } }
    //   );
    // }

    // Get all configuration using admin client (bypasses RLS)
    const config = await getAllConfig(supabaseAdminClient);

    return new Response(JSON.stringify(config), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Config error:", error);

    // Generic error
    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to fetch configuration",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

