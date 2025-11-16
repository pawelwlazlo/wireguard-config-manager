/**
 * Custom hook for Admin Config state management
 */

import { useState, useEffect, useCallback } from "react";
import type { AdminConfigState, ConfigItemVM, SystemStatus } from "@/types";
import { api } from "@/lib/api";

/**
 * Determines system status from configuration values
 * Looks for 'system_status' key or defaults to 'ok'
 */
function deriveSystemStatus(config: Record<string, string>): SystemStatus {
  const statusKey = config.system_status?.toLowerCase();
  
  if (statusKey === "ok" || statusKey === "degraded" || statusKey === "down") {
    return statusKey;
  }
  
  // Default to degraded if no explicit status is set
  return "degraded";
}

/**
 * Converts ConfigDto (key-value map) to array of ConfigItemVM
 */
function mapConfigToItems(config: Record<string, string>): ConfigItemVM[] {
  return Object.entries(config)
    .filter(([key, value]) => key !== "" && value !== undefined)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function useAdminConfig() {
  const [state, setState] = useState<AdminConfigState>({
    items: [],
    status: "degraded",
    loading: true,
    error: null,
  });

  const fetchConfig = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const config = await api.getConfig();
      
      // Map to view models
      const items = mapConfigToItems(config);
      const status = deriveSystemStatus(config);

      setState({
        items,
        status,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Failed to fetch config:", err);
      
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load configuration",
      }));
    }
  }, []);

  const refresh = useCallback(() => {
    return fetchConfig();
  }, [fetchConfig]);

  // Fetch on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    ...state,
    refresh,
  };
}

