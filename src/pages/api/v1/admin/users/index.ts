/**
 * GET /api/v1/admin/users
 * Returns paginated list of users with optional filters (admin only)
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { listUsers } from "@/lib/services/userService";

export const prerender = false;

// Validation schema for query parameters
const QuerySchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  domain: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  size: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.string().regex(/^[a-z_]+:(asc|desc)$/).optional(),
});

export const GET: APIRoute = async ({ url, locals }) => {
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

    // Parse and validate query parameters
    const queryParams = {
      status: url.searchParams.get("status"),
      domain: url.searchParams.get("domain"),
      page: url.searchParams.get("page"),
      size: url.searchParams.get("size"),
      sort: url.searchParams.get("sort"),
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

    const { status, domain, page, size, sort } = validationResult.data;

    const result = await listUsers(locals.supabase, {
      status,
      domain,
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

