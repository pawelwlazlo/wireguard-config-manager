/**
 * PATCH /api/v1/admin/users/{id}
 * Updates user properties (peer_limit, status) - admin only
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { updateUser } from "@/lib/services/userService";

export const prerender = false;

// Validation schemas
const IdParamSchema = z.uuid();

const UpdateUserBodySchema = z.object({
  peer_limit: z.number().int().min(0).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const PATCH: APIRoute = async ({ params, request, locals }) => {
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

    // Parse and validate request body
    let body;
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

    const bodyResult = UpdateUserBodySchema.safeParse(body);
    if (!bodyResult.success) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Invalid request body",
          details: bodyResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if at least one field is provided
    if (
      bodyResult.data.peer_limit === undefined &&
      bodyResult.data.status === undefined
    ) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "At least one field (peer_limit or status) must be provided",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // TODO: Replace with locals.user.id when auth is implemented
    const mockAdminId = "00000000-0000-0000-0000-000000000001";

    const updatedUser = await updateUser(
      locals.supabase,
      userId,
      mockAdminId,
      bodyResult.data
    );

    // TODO: Add audit log event when audit service is implemented
    // if (bodyResult.data.peer_limit !== undefined) {
    //   await auditService.log(locals.supabase, {
    //     event_type: "LIMIT_CHANGE",
    //     actor_id: mockAdminId,
    //     subject_id: userId,
    //     subject_table: "users",
    //     metadata: { old_limit: ..., new_limit: bodyResult.data.peer_limit }
    //   });
    // }
    // if (bodyResult.data.status === "inactive") {
    //   await auditService.log(locals.supabase, {
    //     event_type: "USER_DEACTIVATE",
    //     actor_id: mockAdminId,
    //     subject_id: userId,
    //     subject_table: "users",
    //   });
    // }

    return new Response(JSON.stringify(updatedUser), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating user:", error);

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

      if (error.message === "ValidationError") {
        return new Response(
          JSON.stringify({
            error: "ValidationError",
            message: "Invalid peer limit value",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (error.message === "LimitExceeded") {
        return new Response(
          JSON.stringify({
            error: "LimitExceeded",
            message:
              "Cannot set peer limit below the number of active peers",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }

      if (error.message === "DatabaseError") {
        return new Response(
          JSON.stringify({
            error: "InternalError",
            message: "Database error occurred",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to update user",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

