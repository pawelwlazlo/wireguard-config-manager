/**
 * Confirmation dialog for peer revocation
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PeerRowVM } from "@/types";

interface ConfirmDialogProps {
  peer: PeerRowVM | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (peer: PeerRowVM) => void;
  loading?: boolean;
}

export function ConfirmDialog({
  peer,
  open,
  onClose,
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  if (!peer) return null;

  const handleConfirm = () => {
    onConfirm(peer);
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke Peer</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to revoke this peer? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-4">
          <div>
            <span className="font-semibold">Public Key: </span>
            <span className="font-mono text-sm">{peer.public_key}</span>
          </div>
          {peer.friendly_name && (
            <div>
              <span className="font-semibold">Friendly Name: </span>
              <span>{peer.friendly_name}</span>
            </div>
          )}
          {peer.owner_email && (
            <div>
              <span className="font-semibold">Owner: </span>
              <span>{peer.owner_email}</span>
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Revoking..." : "Revoke"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

