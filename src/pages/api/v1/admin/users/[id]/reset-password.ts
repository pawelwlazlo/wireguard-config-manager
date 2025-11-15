/**
 * POST /api/v1/admin/users/{id}/reset-password
 * Generates a temporary password and resets user's password (admin only)
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { resetUserPassword } from "@/lib/services/userService";

export const prerender = false;

// Validation schema
const IdParamSchema = z.uuid();

export const POST: APIRoute = async ({ params, locals }) => {
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

    // Validate path parameter
    const paramResult = IdParamSchema.safeParse(params.id);
    if (!paramResult.success) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Invalid user ID format",
          details: paramResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = paramResult.data;

    // TODO: Replace with locals.user.id when auth is implemented
    const mockAdminId = "00000000-0000-0000-0000-000000000001";

    // TODO: Pass admin Supabase client (service_role) when available
    // For now we pass null to indicate admin client is not available
    const temporaryPassword = await resetUserPassword(
      locals.supabase,
      null, // supabaseAdmin client not yet implemented
      userId,
      mockAdminId
    );

    // TODO: Add audit log event when audit service is implemented
    // await auditService.log(locals.supabase, {
    //   event_type: "RESET_PASSWORD",
    //   actor_id: mockAdminId,
    //   subject_id: userId,
    //   subject_table: "users",
    //   metadata: { reset_at: new Date().toISOString() }
    // });

    return new Response(
      JSON.stringify({ temporary_password: temporaryPassword }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error resetting user password:", error);

    if (error instanceof Error) {
      if (error.message === "NotFound") {
        return new Response(
          JSON.stringify({
            error: "NotFound",
            message: "User not found",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      if (error.message === "AdminAPIError") {
        return new Response(
          JSON.stringify({
            error: "InternalError",
            message: "Failed to reset password via Admin API",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to reset user password",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

