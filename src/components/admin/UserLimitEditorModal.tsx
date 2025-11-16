/**
 * Modal for editing user peer limit
 */

import { useState, useEffect } from "react";
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
import type { UserVM } from "@/types";

interface UserLimitEditorModalProps {
  user: UserVM;
  open: boolean;
  onClose: () => void;
  onSubmit: (userId: string, newLimit: number) => Promise<void>;
}

const MAX_LIMIT = 50; // Configuration - could be fetched from backend

export function UserLimitEditorModal({
  user,
  open,
  onClose,
  onSubmit,
}: UserLimitEditorModalProps) {
  const [limit, setLimit] = useState<string>(user.peerLimit.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setLimit(user.peerLimit.toString());
      setError(undefined);
    }
  }, [open, user.peerLimit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    const newLimit = Number(limit);

    // Validation
    if (isNaN(newLimit)) {
      setError("Please enter a valid number");
      return;
    }

    if (newLimit < 1) {
      setError("Limit must be at least 1");
      return;
    }

    if (newLimit > MAX_LIMIT) {
      setError(`Limit cannot exceed ${MAX_LIMIT}`);
      return;
    }

    try {
      setLoading(true);
      await onSubmit(user.id, newLimit);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update limit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Peer Limit</DialogTitle>
          <DialogDescription>
            Set the maximum number of peers for {user.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="peer-limit">Peer Limit</Label>
              <Input
                id="peer-limit"
                type="number"
                min="1"
                max={MAX_LIMIT}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Current peers: {user.peersCount} / {user.peerLimit}
              </p>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

