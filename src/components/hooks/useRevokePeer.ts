/**
 * Custom hook for revoking peers (admin)
 */

import { useState } from "react";
import { api } from "@/lib/api";

interface UseRevokePeerResult {
  mutate: (peerId: string) => Promise<boolean>;
  loading: boolean;
  error?: string;
}

export function useRevokePeer(): UseRevokePeerResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const mutate = async (peerId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(undefined);

      await api.revokeAdminPeer(peerId);

      setLoading(false);
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to revoke peer";
      setError(errorMessage);
      setLoading(false);
      return false;
    }
  };

  return {
    mutate,
    loading,
    error,
  };
}

