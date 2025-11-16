/**
 * Custom hook for assigning peers to users
 */

import { useState } from "react";
import type { PeerDto, AssignPeerCommand } from "@/types";
import { api } from "@/lib/api";

interface UseAssignPeerResult {
  mutate: (peerId: string, userId: string) => Promise<PeerDto | null>;
  loading: boolean;
  error?: string;
}

export function useAssignPeer(): UseAssignPeerResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const mutate = async (
    peerId: string,
    userId: string
  ): Promise<PeerDto | null> => {
    try {
      setLoading(true);
      setError(undefined);

      const command: AssignPeerCommand = { user_id: userId };
      const result = await api.assignPeer(peerId, command);

      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to assign peer";
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

