/**
 * PeerList component - container for peer cards in grid layout
 */

import { PeerCard } from "@/components/PeerCard";
import type { PeerDto } from "@/types";

interface PeerListProps {
  peers: PeerDto[];
  onPeerUpdate: (peer: PeerDto) => void;
  onPeerDelete: (id: string) => void;
  onPeerDownload: (id: string) => void;
}

export function PeerList({
  peers,
  onPeerUpdate,
  onPeerDelete,
  onPeerDownload,
}: PeerListProps) {
  if (peers.length === 0) {
    return null;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3" role="list">
      {peers.map((peer) => (
        <li key={peer.id}>
          <PeerCard
            peer={peer}
            onUpdate={onPeerUpdate}
            onDelete={onPeerDelete}
            onDownload={onPeerDownload}
          />
        </li>
      ))}
    </ul>
  );
}

