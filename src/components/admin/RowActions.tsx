/**
 * Row actions dropdown for peer table
 */

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PeerRowVM } from "@/types";

interface RowActionsProps {
  peer: PeerRowVM;
  onAssign: (peer: PeerRowVM) => void;
  onRevoke: (peer: PeerRowVM) => void;
}

export function RowActions({ peer, onAssign, onRevoke }: RowActionsProps) {
  const canAssign = peer.status === "available";
  const canRevoke = peer.status === "active";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!canAssign}
          onClick={() => onAssign(peer)}
        >
          Assign to user
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canRevoke}
          onClick={() => onRevoke(peer)}
          className="text-destructive"
        >
          Revoke peer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

