/**
 * Main admin peers management component
 */

import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { PeerFilters } from "./admin/PeerFilters";
import { PeerList } from "./admin/PeerList";
import { PeerPagination } from "./admin/PeerPagination";
import { AssignmentModal } from "./admin/AssignmentModal";
import { ConfirmDialog } from "./admin/ConfirmDialog";
import { ImportResultDialog } from "./admin/ImportResultDialog";
import { useAdminPeers } from "./hooks/useAdminPeers";
import { useAssignPeer } from "./hooks/useAssignPeer";
import { useRevokePeer } from "./hooks/useRevokePeer";
import { useImportPeers } from "./hooks/useImportPeers";
import { api } from "@/lib/api";
import type { PeerRowVM, PeerFiltersState, UserDto, ImportResultDto } from "@/types";

export function AdminPeers() {
  const {
    peers,
    page,
    size,
    total,
    filters,
    loading,
    error,
    setFilters,
    setPage,
    setSize,
    reload,
  } = useAdminPeers();

  const assignPeer = useAssignPeer();
  const revokePeer = useRevokePeer();
  const importPeers = useImportPeers();

  const [user, setUser] = useState<UserDto | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [importResultDialogOpen, setImportResultDialogOpen] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<PeerRowVM | null>(null);
  const [importResult, setImportResult] = useState<ImportResultDto | null>(null);

  useEffect(() => {
    // Fetch user data for navigation
    api.getUser().then(setUser).catch(console.error);
  }, []);

  const handleFiltersChange = (_newFilters: PeerFiltersState) => {
    // Local state update only - actual submit is handled by handleFiltersSubmit
  };

  const handleFiltersSubmit = (newFilters: PeerFiltersState) => {
    setFilters(newFilters);
  };

  const handleAssignClick = (peer: PeerRowVM) => {
    setSelectedPeer(peer);
    setAssignModalOpen(true);
  };

  const handleRevokeClick = (peer: PeerRowVM) => {
    setSelectedPeer(peer);
    setConfirmDialogOpen(true);
  };

  const handleAssignSubmit = async (peerId: string, userId: string) => {
    try {
      await assignPeer.mutate(peerId, userId);
      toast.success("Peer assigned successfully");
      await reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to assign peer";
      toast.error(message);
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleRevokeConfirm = async (peer: PeerRowVM) => {
    try {
      const success = await revokePeer.mutate(peer.id);
      if (success) {
        toast.success("Peer revoked successfully");
        setConfirmDialogOpen(false);
        await reload();
      } else {
        toast.error("Failed to revoke peer");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke peer";
      toast.error(message);
    }
  };

  const handleImportClick = async () => {
    try {
      const result = await importPeers.mutate();
      if (result) {
        setImportResult(result);
        setImportResultDialogOpen(true);
        toast.success(`Successfully imported ${result.files_imported} peer(s)`);
        await reload();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import peers";
      toast.error(message);
    }
  };

  return (
    <>
      <Toaster />
      <Navigation user={user} />
      <div className="container mx-auto space-y-6 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Peers Management</h1>
            <p className="text-muted-foreground">
              Manage WireGuard peer configurations and assignments
            </p>
          </div>
          <Button
            onClick={handleImportClick}
            disabled={importPeers.loading}
            className="shrink-0"
          >
            {importPeers.loading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
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
                Importing...
              </>
            ) : (
              "Import Peers"
            )}
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <PeerFilters
          value={filters}
          onChange={handleFiltersChange}
          onSubmit={handleFiltersSubmit}
        />

        <PeerList
          peers={peers}
          loading={loading}
          onAssign={handleAssignClick}
          onRevoke={handleRevokeClick}
        />

        {!loading && total > 0 && (
          <PeerPagination
            page={page}
            size={size}
            total={total}
            onPageChange={setPage}
            onSizeChange={setSize}
          />
        )}

        <AssignmentModal
          peer={selectedPeer}
          open={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          onSubmit={handleAssignSubmit}
          loading={assignPeer.loading}
        />

        <ConfirmDialog
          peer={selectedPeer}
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          onConfirm={handleRevokeConfirm}
          loading={revokePeer.loading}
        />

        <ImportResultDialog
          result={importResult}
          open={importResultDialogOpen}
          onClose={() => setImportResultDialogOpen(false)}
        />
      </div>
    </>
  );
}

