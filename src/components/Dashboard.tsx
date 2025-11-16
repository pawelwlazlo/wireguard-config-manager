/**
 * Dashboard component - main user view for managing WireGuard peers
 */

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { useDashboard } from "@/components/hooks/useDashboard";
import { StatsCard } from "@/components/StatsCard";
import { ClaimPeerButton } from "@/components/ClaimPeerButton";
import { PeerList } from "@/components/PeerList";
import { PeerDetailsModal } from "@/components/PeerDetailsModal";
import { EmptyState } from "@/components/EmptyState";
import type { PeerDto } from "@/types";

export function Dashboard() {
  const {
    user,
    peers,
    loading,
    error,
    claimedCount,
    peerLimit,
    downloadPeer,
    updatePeer,
    revokePeer,
  } = useDashboard();

  const [selectedPeer, setSelectedPeer] = useState<PeerDto | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleClaimSuccess = (_peer: PeerDto) => {
    showToast("Configuration claimed successfully!", "success");
  };

  const handleClaimError = (error: Error) => {
    showToast(error.message || "Failed to claim configuration", "error");
  };

  const handlePeerUpdate = (peer: PeerDto) => {
    setSelectedPeer(peer);
  };

  const handlePeerSave = async (peer: PeerDto, friendlyName: string) => {
    try {
      await updatePeer(peer.id, { friendly_name: friendlyName });
      showToast("Configuration updated successfully!", "success");
      setSelectedPeer(null);
    } catch (error) {
      throw error; // Let modal handle the error display
    }
  };

  const handlePeerDelete = async (id: string) => {
    try {
      const success = await revokePeer(id);
      if (success) {
        showToast("Configuration revoked successfully!", "success");
      } else {
        showToast("Failed to revoke configuration", "error");
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to revoke configuration",
        "error"
      );
    }
  };

  const handlePeerDownload = (id: string) => {
    downloadPeer(id);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" role="status" aria-live="polite">
        <div className="flex flex-col items-center space-y-4">
          <svg
            className="h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
      <div className="flex min-h-[400px] items-center justify-center" role="alert" aria-live="assertive">
        <div className="max-w-md text-center">
          <div className="mb-4 text-destructive">
            <svg
              className="mx-auto h-12 w-12"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
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
            className="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isAtLimit = claimedCount >= peerLimit;

  return (
    <>
      <Navigation user={user} />
      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Toast Notification */}
        {toast && (
        <div
          role="alert"
          aria-live="polite"
          aria-atomic="true"
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
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your WireGuard configurations
        </p>
      </header>

      {/* Stats and CTA */}
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" aria-label="Configuration statistics">
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
      </section>

      {/* Peer List or Empty State */}
      <section className="rounded-lg border bg-card p-6" aria-label="Configuration list">
        <h2 className="mb-4 text-lg font-semibold">Your Configurations</h2>
        {peers.length === 0 ? (
          <EmptyState
            variant={isAtLimit ? "limit-reached" : "no-peers"}
            onAction={() => {
              // Scroll to claim button
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : (
          <PeerList
            peers={peers}
            onPeerUpdate={handlePeerUpdate}
            onPeerDelete={handlePeerDelete}
            onPeerDownload={handlePeerDownload}
          />
        )}
      </section>

        {/* Peer Details Modal */}
        <PeerDetailsModal
          peer={selectedPeer}
          onClose={() => setSelectedPeer(null)}
          onSave={handlePeerSave}
        />
      </main>
    </>
  );
}

