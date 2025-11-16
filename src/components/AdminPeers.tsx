/**
 * Main admin peers management component
 */

import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Navigation } from "@/components/Navigation";
import { PeerFilters } from "./admin/PeerFilters";
import { PeerList } from "./admin/PeerList";
import { PeerPagination } from "./admin/PeerPagination";
import { AssignmentModal } from "./admin/AssignmentModal";
import { ConfirmDialog } from "./admin/ConfirmDialog";
import { useAdminPeers } from "./hooks/useAdminPeers";
import { useAssignPeer } from "./hooks/useAssignPeer";
import { useRevokePeer } from "./hooks/useRevokePeer";
import { api } from "@/lib/api";
import type { PeerRowVM, PeerFiltersState, UserDto } from "@/types";

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

  const [user, setUser] = useState<UserDto | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<PeerRowVM | null>(null);

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

  return (
    <>
      <Toaster />
      <Navigation user={user} />
      <div className="container mx-auto space-y-6 py-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Peers Management</h1>
          <p className="text-muted-foreground">
            Manage WireGuard peer configurations and assignments
          </p>
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
      </div>
    </>
  );
}

