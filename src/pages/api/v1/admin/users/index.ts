/**
 * GET /api/v1/admin/users
 * Returns paginated list of users with optional filters (admin only)
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { listUsers } from "@/lib/services/userService";
import { getSupabaseAdminClient } from "@/db/supabase.client";

export const prerender = false;

// Validation schema for query parameters
const QuerySchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  domain: z.string().min(1).optional(),
  role: z.enum(["user", "admin"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  size: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.string().regex(/^[a-z_]+:(asc|desc)$/).optional(),
});

export const GET: APIRoute = async ({ url, locals }) => {
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

    // Parse and validate query parameters
    // Convert null to undefined for optional parameters
    const queryParams = {
      status: url.searchParams.get("status") || undefined,
      domain: url.searchParams.get("domain") || undefined,
      role: url.searchParams.get("role") || undefined,
      page: url.searchParams.get("page") || undefined,
      size: url.searchParams.get("size") || undefined,
      sort: url.searchParams.get("sort") || undefined,
    };

    const validationResult = QuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Invalid query parameters",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { status, domain, role, page, size, sort } = validationResult.data;

    // Use admin client to bypass RLS for listing all users
    const result = await listUsers(getSupabaseAdminClient(), {
      status,
      domain,
      role,
      page,
      size,
      sort,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching users list:", error);

    if (error instanceof Error) {
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
        message: "Failed to fetch users list",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

