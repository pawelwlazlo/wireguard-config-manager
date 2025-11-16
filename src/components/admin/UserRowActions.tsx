/**
 * Row actions dropdown for user table
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
import type { UserVM } from "@/types";

interface UserRowActionsProps {
  user: UserVM;
  onEditLimit: (user: UserVM) => void;
  onResetPassword: (user: UserVM) => void;
  onDeactivate: (user: UserVM) => void;
}

export function UserRowActions({
  user,
  onEditLimit,
  onResetPassword,
  onDeactivate,
}: UserRowActionsProps) {
  const canDeactivate = user.status === "active";

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
        <DropdownMenuItem onClick={() => onEditLimit(user)}>
          Edit peer limit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onResetPassword(user)}>
          Reset password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!canDeactivate}
          onClick={() => onDeactivate(user)}
          className="text-destructive"
        >
          Deactivate user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

