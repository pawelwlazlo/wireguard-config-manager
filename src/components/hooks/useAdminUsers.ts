/**
 * Custom hook for Admin Users state management
 */

import { useState, useEffect, useCallback } from "react";
import type { AdminUsersVM, UserFilter, UserVM, UserDto } from "@/types";
import { api } from "@/lib/api";

interface UseAdminUsersResult extends AdminUsersVM {
  setFilters: (filters: UserFilter) => void;
  setPage: (page: number) => void;
  setSize: (size: number) => void;
  setSort: (sort: string) => void;
  reload: () => Promise<void>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;
const DEFAULT_SORT = "email:asc";

/**
 * Transform UserDto to UserVM with computed fields
 */
function transformUserDto(dto: UserDto): UserVM {
  const domain = dto.email.split("@")[1] || "";
  
  return {
    id: dto.id,
    email: dto.email,
    domain,
    roles: dto.roles,
    status: dto.status,
    peerLimit: dto.peer_limit,
    peersCount: dto.peers_count || 0,
    createdAt: dto.created_at,
  };
}

export function useAdminUsers() {
  const [state, setState] = useState<AdminUsersVM>({
    users: [],
    page: DEFAULT_PAGE,
    size: DEFAULT_SIZE,
    total: 0,
    sort: DEFAULT_SORT,
    filters: {},
    loading: true,
  });

  const fetchData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));

      const result = await api.getAdminUsers({
        status: state.filters.status,
        domain: state.filters.domain,
        role: state.filters.role,
        page: state.page,
        size: state.size,
        sort: state.sort,
      });

      // Transform DTOs to ViewModels
      const users = result.items.map(transformUserDto);

      setState((prev) => ({
        ...prev,
        users,
        page: result.page,
        size: result.size,
        total: result.total,
        loading: false,
      }));
    } catch (error) {
      console.error("Failed to fetch admin users data:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load users",
      }));
    }
  }, [state.filters, state.page, state.size, state.sort]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFilters = useCallback((filters: UserFilter) => {
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

  const setSort = useCallback((sort: string) => {
    setState((prev) => ({ ...prev, sort }));
  }, []);

  const reload = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const result: UseAdminUsersResult = {
    ...state,
    setFilters,
    setPage,
    setSize,
    setSort,
    reload,
  };

  return result;
}

