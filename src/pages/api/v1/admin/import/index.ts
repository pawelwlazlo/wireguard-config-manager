/**
 * POST /api/v1/admin/import
 * Import WireGuard configuration files from designated directory
 */

import type { APIRoute } from "astro";
import { importConfigs } from "@/lib/services/importService";
import { getSupabaseAdminClient } from "@/db/supabase.client";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
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

    // Get configuration from environment
    const importDir = import.meta.env.IMPORT_DIR;
    const encryptionKey = import.meta.env.ENCRYPTION_KEY;

    if (!importDir) {
      return new Response(
        JSON.stringify({
          error: "ConfigError",
          message: "IMPORT_DIR not configured",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!encryptionKey) {
      return new Response(
        JSON.stringify({
          error: "ConfigError",
          message: "ENCRYPTION_KEY not configured",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Perform import using admin client (bypasses RLS)
    const result = await importConfigs(
      getSupabaseAdminClient(),
      importDir,
      encryptionKey,
      locals.user.id
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Import error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === "DirError") {
        return new Response(
          JSON.stringify({
            error: "DirError",
            message: "Failed to read import directory",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Generic error
    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Import operation failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

