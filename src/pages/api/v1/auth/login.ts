/**
 * POST /api/v1/auth/login
 * Login user with email and password
 * Returns JWT token and user profile
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { loginUser } from "@/lib/services/authService";

export const prerender = false;

// Validation schema for login
const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
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

    const validationResult = LoginSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Invalid login data",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email, password } = validationResult.data;

    // Login user via service
    const authResponse = await loginUser(locals.supabase, email, password);

    // Set JWT in HTTP-only cookie for SSR
    // Use Secure flag only in production (HTTPS)
    const isProduction = import.meta.env.PROD;
    const securFlag = isProduction ? "; Secure" : "";
    const headers = new Headers({
      "Content-Type": "application/json",
      "Set-Cookie": `jwt=${authResponse.jwt}; Path=/; HttpOnly${securFlag}; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`, // 7 days
    });

    // Return 200 OK with user data and JWT
    return new Response(JSON.stringify(authResponse), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error during user login:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      switch (error.message) {
        case "InvalidCredentials":
          return new Response(
            JSON.stringify({
              error: "InvalidCredentials",
              message: "Invalid email or password",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );

        case "TooManyAttempts":
          return new Response(
            JSON.stringify({
              error: "TooManyAttempts",
              message: "Too many login attempts. Please try again later.",
            }),
            { status: 429, headers: { "Content-Type": "application/json" } }
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
        message: "Failed to login user",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

