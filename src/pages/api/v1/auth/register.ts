/**
 * POST /api/v1/auth/register
 * Register a new user with email and password
 * Email domain must be in accepted_domains table
 * First user automatically becomes admin (handled by DB trigger)
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { registerUser } from "@/lib/services/authService";

export const prerender = false;

// Validation schema for registration
const RegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
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

    const validationResult = RegisterSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Invalid registration data",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email, password } = validationResult.data;

    // Register user via service
    const authResponse = await registerUser(locals.supabase, email, password);

    // Return 201 Created with user data and JWT
    return new Response(JSON.stringify(authResponse), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error during user registration:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      switch (error.message) {
        case "InvalidDomain":
          return new Response(
            JSON.stringify({
              error: "InvalidDomain",
              message: "Email domain is not in the accepted domains list",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );

        case "EmailExists":
          return new Response(
            JSON.stringify({
              error: "EmailExists",
              message: "Email address is already registered",
            }),
            { status: 409, headers: { "Content-Type": "application/json" } }
          );

        case "WeakPassword":
          return new Response(
            JSON.stringify({
              error: "WeakPassword",
              message:
                "Password does not meet security requirements. Must be at least 8 characters.",
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
        message: "Failed to register user",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

