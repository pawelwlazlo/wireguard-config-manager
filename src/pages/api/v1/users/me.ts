/**
 * GET /api/v1/users/me
 * Returns the authenticated user's profile with roles and peer limit
 */

import type { APIRoute } from "astro";
import { getProfile } from "@/lib/services/userService";

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

    const profile = await getProfile(locals.supabase, locals.user.id);

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "NotFound", message: "User profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);

    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to fetch user profile",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

