/**
 * POST /api/v1/users/me/change-password
 * Change the authenticated user's password
 * Requires current password for verification
 * Returns a new JWT token after successful password change
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { changePassword } from "@/lib/services/authService";
import type { ChangePasswordSuccess } from "@/types/view/change-password";

export const prerender = false;

// Validation schema for password change
const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z
    .string()
    .min(12, "New password must be at least 12 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
      "Password must contain uppercase, lowercase, digit, and special character"
    ),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Invalid JSON in request body",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validationResult = ChangePasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Invalid password change data",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { current_password, new_password } = validationResult.data;

    // Change password via service
    const newJwt = await changePassword(
      locals.supabase,
      locals.user.id,
      current_password,
      new_password
    );

    // Return 200 OK with new JWT
    const response: ChangePasswordSuccess = {
      jwt: newJwt,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error during password change:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      switch (error.message) {
        case "INCORRECT_CURRENT_PASSWORD":
          return new Response(
            JSON.stringify({
              error: "INCORRECT_CURRENT_PASSWORD",
              message: "Current password is incorrect",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );

        case "WEAK_PASSWORD":
          return new Response(
            JSON.stringify({
              error: "WEAK_PASSWORD",
              message:
                "New password does not meet security requirements. Must be at least 12 characters with uppercase, lowercase, digit, and special character.",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );

        case "AuthError":
          return new Response(
            JSON.stringify({
              error: "AuthError",
              message: "Authentication service error. Please try again.",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
      }
    }

    // Generic error fallback
    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to change password",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

