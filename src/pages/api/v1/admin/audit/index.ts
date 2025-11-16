/**
 * GET /api/v1/admin/audit
 * Returns paginated audit log with optional filters (admin only)
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { listAuditLog } from "@/lib/services/auditService";

export const prerender = false;

// List of valid audit event types from database enum
const AUDIT_EVENT_TYPES = [
  "LOGIN",
  "PEER_CLAIM",
  "PEER_ASSIGN",
  "PEER_DOWNLOAD",
  "PEER_REVOKE",
  "RESET_PASSWORD",
  "PASSWORD_CHANGE",
  "LIMIT_CHANGE",
  "USER_DEACTIVATE",
  "IMPORT",
] as const;

// Helper to parse date string to Date object
const dateStringSchema = z.preprocess(
  (val) => {
    if (typeof val === "string" && val.length > 0) {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) {
        return new Date(val);
      }
    }
    return undefined;
  },
  z.date().optional()
);

// Validation schema for query parameters
const AuditQuerySchema = z.object({
  event_type: z.enum(AUDIT_EVENT_TYPES).optional(),
  from: dateStringSchema,
  to: dateStringSchema,
  page: z.coerce.number().int().min(1).optional().default(1),
  size: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z
    .string()
    .regex(/^(created_at|event_type):(asc|desc)$/, {
      message: "Sort must be in format 'column:direction' (allowed: created_at, event_type)",
    })
    .optional(),
});

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    if (!locals.user.roles.includes("admin")) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse and validate query parameters
    const queryParams = {
      event_type: url.searchParams.get("event_type") || undefined,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      page: url.searchParams.get("page") || undefined,
      size: url.searchParams.get("size") || undefined,
      sort: url.searchParams.get("sort") || undefined,
    };

    const validationResult = AuditQuerySchema.safeParse(queryParams);

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

    const { event_type, from, to, page, size, sort } = validationResult.data;

    // Validate date range
    if (from && to && from > to) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Invalid date range: 'from' must be before 'to'",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await listAuditLog(locals.supabase, {
      event_type,
      from,
      to,
      page,
      size,
      sort,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching audit log:", error);

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
        message: "Failed to fetch audit log",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

