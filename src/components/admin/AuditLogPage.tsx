/**
 * Audit Log Page Component
 * Main component for admin audit log view
 */

import { useState, useEffect } from "react";
import { useAuditLog } from "@/components/hooks/useAuditLog";
import { AuditFilters } from "@/components/admin/AuditFilters";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { AuditPagination } from "@/components/admin/AuditPagination";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { api } from "@/lib/api";
import type { AuditEvent, AuditSortOption, UserDto } from "@/types";

export function AuditLogPage() {
  const [user, setUser] = useState<UserDto | null>(null);
  const {
    data,
    loading,
    error,
    setFilters,
    setPage,
    setSort,
    reload,
    currentState,
  } = useAuditLog();

  // Fetch current user
  useEffect(() => {
    api.getUser().then(setUser).catch(console.error);
  }, []);

  // Sync state with URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const eventType = params.get("event_type");
    const fromStr = params.get("from");
    const toStr = params.get("to");
    const pageStr = params.get("page");
    const sortStr = params.get("sort");

    const filters = currentState.filters;
    let shouldUpdate = false;

    if (eventType && eventType !== filters.eventType) {
      shouldUpdate = true;
    }

    if (fromStr) {
      const from = new Date(fromStr);
      if (!filters.from || filters.from.getTime() !== from.getTime()) {
        shouldUpdate = true;
      }
    }

    if (toStr) {
      const to = new Date(toStr);
      if (!filters.to || filters.to.getTime() !== to.getTime()) {
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      const newFilters = {
        eventType: eventType as AuditEvent | undefined,
        from: fromStr ? new Date(fromStr) : undefined,
        to: toStr ? new Date(toStr) : undefined,
      };
      setFilters(newFilters);
    }

    if (pageStr) {
      const page = parseInt(pageStr, 10);
      if (!isNaN(page) && page !== currentState.page) {
        setPage(page);
      }
    }

    if (sortStr && sortStr !== currentState.sort) {
      setSort(sortStr as AuditSortOption);
    }
  }, []);

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();

    if (currentState.filters.eventType) {
      params.set("event_type", currentState.filters.eventType);
    }

    if (currentState.filters.from) {
      params.set("from", currentState.filters.from.toISOString().split("T")[0]);
    }

    if (currentState.filters.to) {
      params.set("to", currentState.filters.to.toISOString().split("T")[0]);
    }

    if (currentState.page > 1) {
      params.set("page", currentState.page.toString());
    }

    if (currentState.sort !== "created_at:desc") {
      params.set("sort", currentState.sort);
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, "", newUrl);
  }, [currentState]);

  const handleRetry = () => {
    reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="mt-2 text-muted-foreground">
            View and filter system audit events
          </p>
        </div>

        {error && (
          <ErrorBanner message={error}>
            <Button onClick={handleRetry} variant="outline" className="mt-2">
              Retry
            </Button>
          </ErrorBanner>
        )}

        <AuditFilters value={currentState.filters} onChange={setFilters} />

        {loading ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <div
              className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
              role="status"
              aria-label="Loading"
            />
            <p className="mt-4 text-muted-foreground">Loading audit log...</p>
          </div>
        ) : data ? (
          <>
            <AuditLogTable
              data={data.items}
              sort={currentState.sort}
              onSortChange={setSort}
            />

            <AuditPagination
              page={data.page}
              size={data.size}
              total={data.total}
              onPageChange={setPage}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}

