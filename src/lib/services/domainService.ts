/**
 * Domain Service
 * Handles synchronization of accepted domains from environment variables to the database
 */

import type { SupabaseClient } from "@/db/supabase.client";
import { getEnv } from "@/lib/env";

/**
 * Synchronizes accepted domains from ACCEPTED_DOMAINS environment variable to the database
 * This function is idempotent and safe to call multiple times
 * 
 * @param supabase - Admin Supabase client (requires service role for insert)
 * @returns Promise<void>
 */
export async function syncAcceptedDomains(supabase: SupabaseClient): Promise<void> {
  try {
    // Read domains from environment variable (dev or production)
    const domainsEnv = getEnv('ACCEPTED_DOMAINS');
    
    if (!domainsEnv) {
      console.info("ACCEPTED_DOMAINS not set, skipping domain sync");
      return;
    }

    // Parse comma-separated domains and trim whitespace
    const domains = domainsEnv
      .split(",")
      .map((d: string) => d.trim())
      .filter((d: string) => d.length > 0);

    if (domains.length === 0) {
      console.info("No domains found in ACCEPTED_DOMAINS, skipping domain sync");
      return;
    }

    console.info(`Syncing ${domains.length} accepted domains to database...`);

    // Insert each domain (using ON CONFLICT DO NOTHING for idempotency)
    for (const domain of domains) {
      const { error } = await supabase
        .schema("app")
        .from("accepted_domains")
        .insert({ domain })
        .select();

      if (error) {
        // Ignore duplicate key errors (23505 = unique_violation)
        if (error.code === "23505") {
          console.debug(`Domain ${domain} already exists, skipping`);
        } else {
          console.error(`Failed to insert domain ${domain}:`, error);
        }
      } else {
        console.info(`✓ Added domain: ${domain}`);
      }
    }

    console.info("Domain synchronization completed");
  } catch (error) {
    console.error("Error syncing accepted domains:", error);
    // Don't throw - we don't want to crash the app if domain sync fails
  }
}

/**
 * Gets all accepted domains from the database
 * 
 * @param supabase - Supabase client
 * @returns Promise<string[]> - Array of domain strings
 */
export async function getAcceptedDomains(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .schema("app")
    .from("accepted_domains")
    .select("domain")
    .order("domain");

  if (error) {
    console.error("Error fetching accepted domains:", error);
    return [];
  }

  return data?.map((row) => row.domain) || [];
}

