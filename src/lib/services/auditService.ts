/**
 * Audit Service
 * Business logic for audit log management
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { Tables } from "@/db/database.types";
import type { AuditDto, AuditEvent, Page } from "@/types";

type AuditRow = Tables<{ schema: "app" }, "audit_log">;

/**
 * Map database row to AuditDto
 */
function mapToAuditDto(
  row: Pick<
    AuditRow,
    "id" | "created_at" | "event_type" | "actor_id" | "subject_id" | "subject_table" | "metadata"
  >
): AuditDto {
  return {
    id: row.id,
    created_at: row.created_at,
    event_type: row.event_type,
    actor_id: row.actor_id,
    subject_id: row.subject_id,
    subject_table: row.subject_table,
    metadata: row.metadata,
  };
}

/**
 * Parse sort parameter into column and direction
 * Whitelist: created_at, event_type
 */
function parseSortParam(sort?: string): { column: string; ascending: boolean } {
  if (!sort) {
    return { column: "created_at", ascending: false }; // default: created_at:desc
  }

  const [column, direction] = sort.split(":");
  const validColumns = ["created_at", "event_type"];

  if (!validColumns.includes(column)) {
    return { column: "created_at", ascending: false };
  }

  return {
    column,
    ascending: direction === "asc",
  };
}

/**
 * List audit log entries with filtering and pagination (admin only)
 * Supports filtering by event_type and date range
 */
export async function listAuditLog(
  supabase: SupabaseClient,
  options: {
    event_type?: AuditEvent;
    from?: Date;
    to?: Date;
    page?: number;
    size?: number;
    sort?: string;
  }
): Promise<Page<AuditDto>> {
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const offset = (page - 1) * size;
  const { column, ascending } = parseSortParam(options.sort);

  // Build query with filters
  let query = supabase
    .schema("app")
    .from("audit_log")
    .select("id, created_at, event_type, actor_id, subject_id, subject_table, metadata");

  // Apply filters
  if (options.event_type) {
    query = query.eq("event_type", options.event_type);
  }

  if (options.from) {
    query = query.gte("created_at", options.from.toISOString());
  }

  if (options.to) {
    query = query.lte("created_at", options.to.toISOString());
  }

  // Apply sorting and pagination
  query = query.order(column, { ascending }).range(offset, offset + size - 1);

  const { data: auditLogs, error: fetchError } = await query;

  if (fetchError) {
    console.error("Database error fetching audit logs:", fetchError);
    throw new Error("DatabaseError");
  }

  // Get total count with same filters
  let countQuery = supabase.schema("app").from("audit_log").select("*", { count: "exact", head: true });

  if (options.event_type) {
    countQuery = countQuery.eq("event_type", options.event_type);
  }

  if (options.from) {
    countQuery = countQuery.gte("created_at", options.from.toISOString());
  }

  if (options.to) {
    countQuery = countQuery.lte("created_at", options.to.toISOString());
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("Database error counting audit logs:", countError);
    throw new Error("DatabaseError");
  }

  return {
    items: (auditLogs || []).map(mapToAuditDto),
    page,
    size,
    total: count || 0,
  };
}

