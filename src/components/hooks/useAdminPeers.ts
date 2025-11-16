/**
 * Custom hook for Admin Peers state management
 */

import { useState, useEffect, useCallback } from "react";
import type { AdminPeersVM, PeerFiltersState, PeerRowVM } from "@/types";
import { api } from "@/lib/api";

interface UseAdminPeersResult extends AdminPeersVM {
  setFilters: (filters: PeerFiltersState) => void;
  setPage: (page: number) => void;
  setSize: (size: number) => void;
  reload: () => Promise<void>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;

export function useAdminPeers() {
  const [state, setState] = useState<AdminPeersVM>({
    peers: [],
    page: DEFAULT_PAGE,
    size: DEFAULT_SIZE,
    total: 0,
    filters: {},
    loading: true,
  });

  const fetchData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));

      const result = await api.getAdminPeers({
        status: state.filters.status,
        owner: state.filters.owner,
        page: state.page,
        size: state.size,
      });

      setState((prev) => ({
        ...prev,
        peers: result.items,
        page: result.page,
        size: result.size,
        total: result.total,
        loading: false,
      }));
    } catch (error) {
      console.error("Failed to fetch admin peers data:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load peers",
      }));
    }
  }, [state.filters, state.page, state.size]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFilters = useCallback((filters: PeerFiltersState) => {
    setState((prev) => ({
      ...prev,
      filters,
      page: DEFAULT_PAGE, // Reset to first page when filters change
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page }));
  }, []);

  const setSize = useCallback((size: number) => {
    setState((prev) => ({
      ...prev,
      size,
      page: DEFAULT_PAGE, // Reset to first page when size changes
    }));
  }, []);

  const reload = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const result: UseAdminPeersResult = {
    ...state,
    setFilters,
    setPage,
    setSize,
    reload,
  };

  return result;
}

