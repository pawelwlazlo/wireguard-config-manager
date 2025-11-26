/**
 * Custom hook for importing WireGuard peer configurations
 */

import { useState } from "react";
import type { ImportResultDto } from "@/types";
import { api } from "@/lib/api";

interface UseImportPeersResult {
  mutate: () => Promise<ImportResultDto | null>;
  loading: boolean;
  error?: string;
}

export function useImportPeers(): UseImportPeersResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const mutate = async (): Promise<ImportResultDto | null> => {
    try {
      setLoading(true);
      setError(undefined);

      const result = await api.importPeers();

      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to import peers";
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  return {
    mutate,
    loading,
    error,
  };
}

