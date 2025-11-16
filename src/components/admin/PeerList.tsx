/**
 * Peers table for admin view
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "./RowActions";
import type { PeerRowVM, PeerStatus } from "@/types";

interface PeerListProps {
  peers: PeerRowVM[];
  loading: boolean;
  onAssign: (peer: PeerRowVM) => void;
  onRevoke: (peer: PeerRowVM) => void;
}

const STATUS_VARIANTS: Record<
  PeerStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  available: "secondary",
  active: "default",
  inactive: "destructive",
};

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateKey(key: string, length = 16): string {
  if (key.length <= length) return key;
  return `${key.substring(0, length)}...`;
}

export function PeerList({ peers, loading, onAssign, onRevoke }: PeerListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading peers...</div>
      </div>
    );
  }

  if (peers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No peers found</div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Public Key</TableHead>
            <TableHead>Friendly Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Claimed At</TableHead>
            <TableHead>Revoked At</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {peers.map((peer) => (
            <TableRow key={peer.id}>
              <TableCell className="font-mono text-sm">
                <span title={peer.public_key}>
                  {truncateKey(peer.public_key)}
                </span>
              </TableCell>
              <TableCell>{peer.friendly_name || "—"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[peer.status]}>
                  {peer.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {peer.owner_email && (
                    <span className="text-sm">{peer.owner_email}</span>
                  )}
                  {peer.owner_id && (
                    <span className="font-mono text-xs text-muted-foreground" title={peer.owner_id}>
                      {truncateKey(peer.owner_id, 12)}
                    </span>
                  )}
                  {!peer.owner_email && !peer.owner_id && "—"}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(peer.claimed_at)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(peer.revoked_at)}
              </TableCell>
              <TableCell>
                <RowActions
                  peer={peer}
                  onAssign={onAssign}
                  onRevoke={onRevoke}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

