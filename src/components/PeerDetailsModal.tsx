/**
 * PeerDetailsModal component - modal for viewing/editing peer details
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
import { Badge } from "@/components/ui/badge";
import type { PeerDto } from "@/types";
import { cn } from "@/lib/utils";

interface PeerDetailsModalProps {
  peer: PeerDto | null;
  onClose: () => void;
  onSave: (peer: PeerDto, friendlyName: string) => Promise<void>;
}

// Regex pattern for friendly_name validation: lowercase alphanumeric and hyphens, 1-63 chars
const FRIENDLY_NAME_PATTERN = /^[a-z0-9-]{1,63}$/;

export function PeerDetailsModal({ peer, onClose, onSave }: PeerDetailsModalProps) {
  const [friendlyName, setFriendlyName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (peer) {
      setFriendlyName(peer.friendly_name || "");
      setError(null);
    }
  }, [peer]);

  const handleSave = async () => {
    if (!peer) return;

    // Validate friendly name
    if (friendlyName && !FRIENDLY_NAME_PATTERN.test(friendlyName)) {
      setError(
        "Friendly name must be 1-63 characters long and contain only lowercase letters, numbers, and hyphens"
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(peer, friendlyName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update peer");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!peer) return null;

  const isRevoked = peer.revoked_at !== null;
  const isActive = peer.status === "active" && !isRevoked;

  return (
    <Dialog open={!!peer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Configuration Details</DialogTitle>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={cn(
                isActive && "bg-green-500 hover:bg-green-600",
                isRevoked && "bg-gray-400"
              )}
            >
              {isRevoked ? "Revoked" : peer.status}
            </Badge>
          </div>
          <DialogDescription>
            View and edit your WireGuard configuration details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Friendly Name Input */}
          <div className="space-y-2">
            <Label htmlFor="friendly-name">Friendly Name</Label>
            <Input
              id="friendly-name"
              value={friendlyName}
              onChange={(e) => {
                setFriendlyName(e.target.value);
                setError(null);
              }}
              placeholder="my-wireguard-config"
              disabled={isSaving}
              className={cn(error && "border-destructive")}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Use lowercase letters, numbers, and hyphens (1-63 characters)
            </p>
          </div>

          {/* Public Key */}
          <div className="space-y-2">
            <Label>Public Key</Label>
            <div className="rounded-md bg-muted p-3">
              <code className="text-sm font-mono break-all">{peer.public_key}</code>
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Claimed At</Label>
              <p className="text-sm text-muted-foreground">
                {formatDate(peer.claimed_at)}
              </p>
            </div>
            {isRevoked && (
              <div className="space-y-2">
                <Label className="text-destructive">Revoked At</Label>
                <p className="text-sm text-destructive">
                  {formatDate(peer.revoked_at)}
                </p>
              </div>
            )}
          </div>

          {/* ID */}
          <div className="space-y-2">
            <Label>Configuration ID</Label>
            <p className="text-xs font-mono text-muted-foreground">{peer.id}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

