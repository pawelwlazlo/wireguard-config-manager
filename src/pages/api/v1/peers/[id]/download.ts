/**
 * GET /api/v1/peers/{id}/download
 * Download peer configuration file (.conf)
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { getPeerConfig } from "@/lib/services/peerService";

export const prerender = false;

const IdParamSchema = z.uuid();

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Validate path parameter
    const parseResult = IdParamSchema.safeParse(params.id);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "InvalidId",
          message: "Invalid peer ID format",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const peerId = parseResult.data;

    // Get peer config (RLS will handle access control)
    const peerConfig = await getPeerConfig(locals.supabase, peerId);

    // TODO: Decrypt config_ciphertext
    // For now, we'll assume config_ciphertext is base64 encoded
    // In production, this should be decrypted using a crypto service
    let configContent: string;
    try {
      // Decode base64
      configContent = atob(peerConfig.config_ciphertext);
    } catch {
      // If not base64, use as-is (for testing)
      configContent = peerConfig.config_ciphertext;
    }

    // Generate filename
    const filename = peerConfig.friendly_name
      ? `${peerConfig.friendly_name}.conf`
      : `peer-${peerId.substring(0, 8)}.conf`;

    // Return file with appropriate headers
    return new Response(configContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Security-Policy": "default-src 'none';",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error downloading peer config:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === "NotFound") {
        return new Response(
          JSON.stringify({
            error: "NotFound",
            message: "Peer not found",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Generic error
    return new Response(
      JSON.stringify({
        error: "InternalError",
        message: "Failed to download peer configuration",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

