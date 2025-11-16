/**
 * Config Service
 * Business logic for system configuration management
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { ConfigDto } from "@/types";

/**
 * Get all configuration key-value pairs
 * Returns a map of configuration settings
 */
export async function getAllConfig(
  supabase: SupabaseClient
): Promise<ConfigDto> {
  const { data, error } = await supabase
    .schema("app")
    .from("config_kv")
    .select("key, value");

  if (error) {
    console.error("Failed to fetch config:", error);
    throw new Error("Failed to fetch configuration");
  }

  // Transform array of {key, value} into object {[key]: value}
  const configMap: ConfigDto = {};
  
  if (data) {
    for (const item of data) {
      configMap[item.key] = item.value;
    }
  }

  return configMap;
}

