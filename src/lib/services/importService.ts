/**
 * Import Service
 * Business logic for importing WireGuard configuration files
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { ImportResultDto } from "@/types";
import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { encryptConfig } from "./cryptoService";

/**
 * Parse WireGuard peer config file and extract Address as unique identifier
 * Peer configs contain the server's PublicKey (same for all), so we use
 * the peer's Address field from [Interface] section as unique identifier
 */
function parseWireGuardPeerConfig(content: string): string | null {
  const lines = content.split("\n");
  let inInterfaceSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Track which section we're in
    if (trimmed === "[Interface]") {
      inInterfaceSection = true;
      continue;
    } else if (trimmed.startsWith("[")) {
      inInterfaceSection = false;
      continue;
    }
    
    // Extract Address from [Interface] section
    if (inInterfaceSection && trimmed.startsWith("Address")) {
      const parts = trimmed.split("=");
      if (parts.length === 2) {
        const address = parts[1].trim();
        
        // Validate that address doesn't contain unresolved variables
        if (address.includes("${") || address.includes("$")) {
          console.warn(`Address contains unresolved variables: ${address}`);
          return null;
        }
        
        // Validate that address looks like a valid IP/CIDR
        // Should match patterns like: 10.0.0.2/32 or 10.0.0.2
        const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?$/;
        if (!ipPattern.test(address)) {
          console.warn(`Address doesn't match valid IP format: ${address}`);
          return null;
        }
        
        return address;
      }
    }
  }
  
  return null;
}

/**
 * Recursively find all .conf files in directory and subdirectories
 */
async function findConfFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subResults = await findConfFiles(fullPath);
        results.push(...subResults);
      } else if (entry.isFile() && extname(entry.name) === ".conf") {
        results.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
  
  return results;
}


/**
 * Import WireGuard configuration files from directory
 */
export async function importConfigs(
  supabase: SupabaseClient,
  importDir: string,
  encryptionKey: string,
  importedBy: string
): Promise<ImportResultDto> {
  // Recursively find all .conf files
  let confFiles: string[];
  try {
    confFiles = await findConfFiles(importDir);
  } catch (error) {
    console.error("Failed to scan import directory:", error);
    throw new Error("DirError");
  }

  if (confFiles.length === 0) {
    // No files to import - return success with 0 files
    return {
      files_imported: 0,
      batch_id: "",
      skipped: 0,
    };
  }

  // Create import batch record
  const { data: batchData, error: batchError } = await supabase
    .schema("app")
    .from("import_batches")
    .insert({
      files_imported: 0, // Will update after import
      imported_by: importedBy,
    })
    .select("id")
    .single();

  if (batchError || !batchData) {
    console.error("Failed to create import batch:", batchError);
    throw new Error("Failed to create import batch");
  }

  const batchId = batchData.id;
  let successCount = 0;
  let skippedCount = 0;

  // Process each config file
  for (const filePath of confFiles) {
    try {
      // Read file content
      const content = await readFile(filePath, "utf-8");
      
      // Parse and extract Address as unique identifier
      const peerAddress = parseWireGuardPeerConfig(content);
      
      if (!peerAddress) {
        console.warn(`Skipping ${filePath}: no Address found in [Interface] section`);
        continue;
      }

      // Encrypt config content
      const ciphertext = encryptConfig(content, encryptionKey);

      // Insert peer record with batch tracking
      // Use peer's Address as public_key (unique identifier)
      const { error: insertError } = await supabase
        .schema("app")
        .from("peers")
        .insert({
          public_key: peerAddress, // Using Address as unique identifier
          config_ciphertext: ciphertext,
          status: "available",
          imported_at: new Date().toISOString(),
          import_batch_id: batchId,
        });

      if (insertError) {
        // Check if it's a duplicate key error (PostgreSQL error code 23505)
        if (insertError.code === '23505') {
          // Silently skip duplicates - peer already imported
          console.debug(`Skipping duplicate peer from ${filePath}: ${peerAddress}`);
          skippedCount++;
        } else {
          // Log other errors
          console.error(`Failed to import ${filePath}:`, insertError);
        }
        continue;
      }

      successCount++;
    } catch (error) {
      // Log error but continue with other files
      console.error(`Error processing ${filePath}:`, error);
      continue;
    }
  }

  // Update batch with final count
  const { error: updateError } = await supabase
    .schema("app")
    .from("import_batches")
    .update({
      files_imported: successCount,
    })
    .eq("id", batchId);

  if (updateError) {
    console.error("Failed to update batch count:", updateError);
  }

  // Create audit log entry
  const { error: auditError } = await supabase
    .schema("app")
    .from("audit_log")
    .insert({
      event_type: "IMPORT",
      actor_id: importedBy,
      subject_table: "import_batches",
      subject_id: batchId,
      metadata: {
        batch_id: batchId,
        files_imported: successCount,
        files_skipped: skippedCount,
        total_files: confFiles.length,
      },
    });

  if (auditError) {
    console.error("Failed to create audit log:", auditError);
  }

  return {
    files_imported: successCount,
    batch_id: batchId,
    skipped: skippedCount,
  };
}

