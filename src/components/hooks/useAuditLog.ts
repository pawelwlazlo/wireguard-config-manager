/**
 * Custom hook for Admin Audit Log state management
 */

import { useState, useEffect, useCallback } from "react";
import type { 
  AuditPageState, 
  AuditFiltersState, 
  AuditSortOption,
  UseAuditLogResult 
} from "@/types";
import { api } from "@/lib/api";

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;
const DEFAULT_SORT: AuditSortOption = "created_at:desc";

export function useAuditLog() {
  const [state, setState] = useState<AuditPageState>({
    page: DEFAULT_PAGE,
    size: DEFAULT_SIZE,
    sort: DEFAULT_SORT,
    filters: {},
  });

  const [data, setData] = useState<UseAuditLogResult["data"]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const result = await api.getAuditLog({
        event_type: state.filters.eventType,
        from: state.filters.from,
        to: state.filters.to,
        page: state.page,
        size: state.size,
        sort: state.sort,
      });

      setData(result);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch audit log data:", err);
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to load audit log");
    }
  }, [state.filters, state.page, state.size, state.sort]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setStatePartial = useCallback((partial: Partial<AuditPageState>) => {
    setState((prev) => {
      const newState = { ...prev, ...partial };
      
      // Reset to first page when filters or sort change
      if (partial.filters !== undefined || partial.sort !== undefined) {
        newState.page = DEFAULT_PAGE;
      }
      
      return newState;
    });
  }, []);

  const setFilters = useCallback((filters: AuditFiltersState) => {
    setStatePartial({ filters });
  }, [setStatePartial]);

  const setPage = useCallback((page: number) => {
    setStatePartial({ page });
  }, [setStatePartial]);

  const setSize = useCallback((size: number) => {
    setStatePartial({ size, page: DEFAULT_PAGE });
  }, [setStatePartial]);

  const setSort = useCallback((sort: AuditSortOption) => {
    setStatePartial({ sort });
  }, [setStatePartial]);

  const reload = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const result: UseAuditLogResult & {
    setFilters: (filters: AuditFiltersState) => void;
    setPage: (page: number) => void;
    setSize: (size: number) => void;
    setSort: (sort: AuditSortOption) => void;
    reload: () => Promise<void>;
    currentState: AuditPageState;
  } = {
    data,
    loading,
    error,
    setState: setStatePartial,
    setFilters,
    setPage,
    setSize,
    setSort,
    reload,
    currentState: state,
  };

  return result;
}

