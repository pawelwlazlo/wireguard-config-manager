/**
 * Admin Config Page - main component for system configuration view
 */

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { StatusBar } from "@/components/admin/config/StatusBar";
import { ConfigGrid } from "@/components/admin/config/ConfigGrid";
import { useAdminConfig } from "@/components/hooks/useAdminConfig";
import { api } from "@/lib/api";
import type { UserDto } from "@/types";

export function AdminConfigPage() {
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const { items, status, loading, error, refresh } = useAdminConfig();

  // Fetch current user for navigation
  useEffect(() => {
    api.getUser().then(setCurrentUser).catch(console.error);
  }, []);

  const handleRefresh = async () => {
    await refresh();
  };

  return (
    <>
      <Navigation user={currentUser} />
      <div className="container mx-auto space-y-6 px-4 py-8">
        {/* Header with refresh button */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              System Configuration
            </h1>
            <p className="mt-2 text-muted-foreground">
              View current system configuration and status
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={loading}
            aria-label="Refresh configuration"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <ErrorBanner message={error}>
            <Button onClick={handleRefresh} variant="outline" className="mt-2">
              Try Again
            </Button>
          </ErrorBanner>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="rounded-lg border bg-card p-8 text-center">
            <div
              className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
              role="status"
              aria-label="Loading configuration"
            />
            <p className="mt-4 text-muted-foreground">
              Loading configuration...
            </p>
          </div>
        )}

        {/* Content - only show when not loading or when we have data */}
        {!loading && !error && (
          <>
            {/* Status indicator */}
            <StatusBar status={status} />

            {/* Config items grid */}
            {items.length > 0 ? (
              <ConfigGrid items={items} />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
                <svg
                  className="mb-4 h-16 w-16 text-muted-foreground/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h3 className="mb-2 text-lg font-semibold">
                  No Configuration Available
                </h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  There are no configuration items to display at this time.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

