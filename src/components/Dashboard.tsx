/**
 * Dashboard component - main user view for managing WireGuard peers
 */

import { useState } from "react";
import { useDashboard } from "@/components/hooks/useDashboard";
import { StatsCard } from "@/components/StatsCard";
import { ClaimPeerButton } from "@/components/ClaimPeerButton";
import type { PeerDto } from "@/types";

export function Dashboard() {
  const {
    user,
    peers,
    loading,
    error,
    claimedCount,
    peerLimit,
    claimPeer,
    downloadPeer,
    updatePeer,
    revokePeer,
  } = useDashboard();

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleClaimSuccess = (peer: PeerDto) => {
    showToast("Configuration claimed successfully!", "success");
  };

  const handleClaimError = (error: Error) => {
    showToast(error.message || "Failed to claim configuration", "error");
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <svg
            className="h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mb-4 text-destructive">
            <svg
              className="mx-auto h-12 w-12"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold">Failed to Load Dashboard</h2>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isAtLimit = claimedCount >= peerLimit;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg border p-4 shadow-lg transition-all ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your WireGuard configurations
        </p>
      </div>

      {/* Stats and CTA */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <StatsCard
          claimedCount={claimedCount}
          peerLimit={peerLimit}
          className="flex-1"
        />
        <div className="flex items-center">
          <ClaimPeerButton
            disabled={isAtLimit}
            onClaimSuccess={handleClaimSuccess}
            onClaimError={handleClaimError}
          />
        </div>
      </div>

      {/* Peer List Placeholder */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Your Configurations</h2>
        {peers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              No configurations yet. Click "Get New Configuration" to claim one.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {peers.map((peer) => (
              <div
                key={peer.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">
                    {peer.friendly_name || "Unnamed Configuration"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {peer.public_key.substring(0, 20)}...
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                    {peer.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

