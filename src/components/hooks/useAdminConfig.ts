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
  
  // Default to 'ok' if no explicit status is set - if system is responding, it's operational
  return "ok";
}

/**
 * Converts ConfigDto (key-value map) to array of ConfigItemVM
 * Filters out invalid entries and sorts alphabetically
 */
function mapConfigToItems(config: Record<string, string>): ConfigItemVM[] {
  return Object.entries(config)
    .filter(([key, value]) => {
      // Filter out empty keys, undefined/null values, and non-string values
      return (
        key &&
        key.trim() !== "" &&
        value !== undefined &&
        value !== null &&
        typeof value === "string"
      );
    })
    .map(([key, value]) => ({
      key: key.trim(),
      value: String(value).trim(),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function useAdminConfig() {
  const [state, setState] = useState<AdminConfigState>({
    items: [],
    status: "ok",
    loading: true,
    error: null,
  });

  const fetchConfig = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const config = await api.getConfig();
      
      // Validate response - must be an object
      if (!config || typeof config !== "object") {
        throw new Error("Invalid configuration response from server");
      }

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
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to load configuration";
      
      if (err instanceof Error) {
        // Check for specific error types
        if (err.message.includes("permission")) {
          errorMessage = "Access denied. You do not have permission to view this configuration.";
        } else if (err.message.includes("network") || err.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (err.message.includes("Unauthorized")) {
          errorMessage = "Your session has expired. Please log in again.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
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

