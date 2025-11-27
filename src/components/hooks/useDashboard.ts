/**
 * Custom hook for Dashboard state management
 */

import { useState, useEffect, useCallback } from "react";
import type { UserDto, PeerDto, UpdatePeerCommand } from "@/types";
import { api } from "@/lib/api";

interface DashboardState {
  user?: UserDto;
  peers: PeerDto[];
  loading: boolean;
  error?: string;
}

interface DashboardActions {
  claimPeer: () => Promise<PeerDto | null>;
  downloadPeer: (id: string) => Promise<void>;
  updatePeer: (id: string, data: UpdatePeerCommand) => Promise<PeerDto | null>;
  revokePeer: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    peers: [],
    loading: true,
  });

  const fetchData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));

      // Fetch user and peers in parallel
      const [user, peersPage] = await Promise.all([
        api.getUser(),
        api.getPeers("active"),
      ]);

      setState({
        user,
        peers: peersPage.items,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load data",
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const claimPeer = useCallback(async (): Promise<PeerDto | null> => {
    try {
      const newPeer = await api.claimPeer();
      setState((prev) => ({
        ...prev,
        peers: [...prev.peers, newPeer],
      }));
      return newPeer;
    } catch (error) {
      console.error("Failed to claim peer:", error);
      throw error;
    }
  }, []);

  const downloadPeer = useCallback(async (id: string): Promise<void> => {
    try {
      await api.downloadPeer(id);
    } catch (error) {
      console.error("Failed to download peer:", error);
      throw error;
    }
  }, []);

  const updatePeer = useCallback(
    async (id: string, data: UpdatePeerCommand): Promise<PeerDto | null> => {
      try {
        const updatedPeer = await api.updatePeer(id, data);
        setState((prev) => ({
          ...prev,
          peers: prev.peers.map((p) => (p.id === id ? updatedPeer : p)),
        }));
        return updatedPeer;
      } catch (error) {
        console.error("Failed to update peer:", error);
        throw error;
      }
    },
    []
  );

  const revokePeer = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.revokePeer(id);
      setState((prev) => ({
        ...prev,
        peers: prev.peers.filter((p) => p.id !== id),
      }));
      return true;
    } catch (error) {
      console.error("Failed to revoke peer:", error);
      return false;
    }
  }, []);

  const actions: DashboardActions = {
    claimPeer,
    downloadPeer,
    updatePeer,
    revokePeer,
    refresh: fetchData,
  };

  return {
    ...state,
    ...actions,
    claimedCount: state.peers.length,
    peerLimit: state.user?.peer_limit ?? 0,
    user: state.user,
  };
}

