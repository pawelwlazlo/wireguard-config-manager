/**
 * Users table for admin view with sortable columns
 */

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserRowActions } from "./UserRowActions";
import type { UserVM, UserStatus } from "@/types";

interface UserTableProps {
  users: UserVM[];
  loading: boolean;
  sort: string;
  onSortChange: (sort: string) => void;
  onEditLimit: (user: UserVM) => void;
  onResetPassword: (user: UserVM) => void;
  onDeactivate: (user: UserVM) => void;
}

const STATUS_VARIANTS: Record<
  UserStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  inactive: "destructive",
};

type SortableColumn = "email" | "status" | "domain" | "peer_limit";

interface SortHeaderProps {
  column: SortableColumn;
  currentSort: string;
  onSortChange: (sort: string) => void;
  children: React.ReactNode;
}

function SortHeader({ column, currentSort, onSortChange, children }: SortHeaderProps) {
  const [field, direction] = currentSort.split(":");
  const isActive = field === column;
  const nextDirection = isActive && direction === "asc" ? "desc" : "asc";

  const handleClick = () => {
    onSortChange(`${column}:${nextDirection}`);
  };

  const Icon = isActive
    ? direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <TableHead>
      <Button
        variant="ghost"
        onClick={handleClick}
        className="-ml-3 h-8 data-[state=open]:bg-accent"
      >
        {children}
        <Icon className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UserTable({
  users,
  loading,
  sort,
  onSortChange,
  onEditLimit,
  onResetPassword,
  onDeactivate,
}: UserTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No users found</div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader column="email" currentSort={sort} onSortChange={onSortChange}>
              Email
            </SortHeader>
            <SortHeader column="domain" currentSort={sort} onSortChange={onSortChange}>
              Domain
            </SortHeader>
            <TableHead>Role</TableHead>
            <SortHeader column="status" currentSort={sort} onSortChange={onSortChange}>
              Status
            </SortHeader>
            <SortHeader column="peer_limit" currentSort={sort} onSortChange={onSortChange}>
              Peer Limit
            </SortHeader>
            <TableHead>Peers</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {user.domain}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {user.roles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[user.status]}>
                  {user.status}
                </Badge>
              </TableCell>
              <TableCell className="text-center">{user.peerLimit}</TableCell>
              <TableCell className="text-center">
                <span className={user.peersCount > user.peerLimit ? "text-destructive font-semibold" : ""}>
                  {user.peersCount}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(user.createdAt)}
              </TableCell>
              <TableCell>
                <UserRowActions
                  user={user}
                  onEditLimit={onEditLimit}
                  onResetPassword={onResetPassword}
                  onDeactivate={onDeactivate}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

