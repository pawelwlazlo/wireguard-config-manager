/**
 * POST /api/v1/auth/logout
 * Logout user by invalidating their session
 * Requires Authorization Bearer token in header
 */

import type { APIRoute } from "astro";
import { logoutUser } from "@/lib/services/authService";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check for Authorization header
    const authHeader = request.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Missing or invalid Authorization header",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user is authenticated via middleware
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or expired token",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = locals.user.id;

    // Logout user via service
    await logoutUser(locals.supabase, userId);

    // Return 204 No Content on successful logout
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error during user logout:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === "AuthError") {
        return new Response(
          JSON.stringify({
            error: "AuthError",
            message: "Failed to logout. Please try again.",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Generic error fallback
    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to logout user",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

