/**
 * Modal for assigning a peer to a user
 */

import { useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PeerRowVM } from "@/types";

interface AssignmentModalProps {
  peer: PeerRowVM | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (peerId: string, userId: string) => Promise<void>;
  loading?: boolean;
}

const userIdSchema = z.string().uuid("Invalid user ID format (must be UUID)");

export function AssignmentModal({
  peer,
  open,
  onClose,
  onSubmit,
  loading = false,
}: AssignmentModalProps) {
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setUserId("");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate user ID
    const validation = userIdSchema.safeParse(userId.trim());
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    if (!peer) return;

    try {
      await onSubmit(peer.id, validation.data);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign peer");
    }
  };

  if (!peer) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Peer to User</DialogTitle>
          <DialogDescription>
            Assign this peer to a specific user by entering their user ID (UUID).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div>
                <span className="text-sm font-semibold">Public Key: </span>
                <span className="font-mono text-sm text-muted-foreground">
                  {peer.public_key.substring(0, 20)}...
                </span>
              </div>
              {peer.friendly_name && (
                <div>
                  <span className="text-sm font-semibold">Friendly Name: </span>
                  <span className="text-sm text-muted-foreground">
                    {peer.friendly_name}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-id">User ID (UUID)</Label>
              <Input
                id="user-id"
                type="text"
                placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loading}
                required
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

