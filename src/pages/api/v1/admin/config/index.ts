/**
 * GET /api/v1/admin/config
 * Get system configuration key-value pairs (read-only)
 */

import type { APIRoute } from "astro";
import { getAllConfig } from "@/lib/services/configService";
import { getSupabaseAdminClient } from "@/db/supabase.client";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
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

    // Get all configuration using admin client (bypasses RLS)
    const config = await getAllConfig(getSupabaseAdminClient());

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

