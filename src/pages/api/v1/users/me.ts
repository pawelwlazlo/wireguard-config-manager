/**
 * GET /api/v1/users/me
 * Returns the authenticated user's profile with roles and peer limit
 */

import type { APIRoute } from "astro";

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

    // User profile is already loaded by middleware
    return new Response(JSON.stringify(locals.user), {
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

