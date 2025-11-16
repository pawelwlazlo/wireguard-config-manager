/**
 * Filters component for admin users list
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserFilter, UserStatus, RoleName } from "@/types";

interface UserTableFilterBarProps {
  value: UserFilter;
  onChange: (filters: UserFilter) => void;
}

const USER_STATUSES: { value: UserStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const USER_ROLES: { value: RoleName; label: string }[] = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

export function UserTableFilterBar({ value, onChange }: UserTableFilterBarProps) {
  const [localFilters, setLocalFilters] = useState<UserFilter>(value);

  // Debounce domain filter
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localFilters);
    }, 300);

    return () => clearTimeout(timer);
  }, [localFilters, onChange]);

  const handleStatusChange = (status: string) => {
    const newFilters = {
      ...localFilters,
      status: status === "all" ? undefined : (status as UserStatus),
    };
    setLocalFilters(newFilters);
  };

  const handleDomainChange = (domain: string) => {
    const newFilters = {
      ...localFilters,
      domain: domain.trim() || undefined,
    };
    setLocalFilters(newFilters);
  };

  const handleRoleChange = (role: string) => {
    const newFilters = {
      ...localFilters,
      role: role === "all" ? undefined : (role as RoleName),
    };
    setLocalFilters(newFilters);
  };

  const handleReset = () => {
    const emptyFilters: UserFilter = {};
    setLocalFilters(emptyFilters);
    onChange(emptyFilters);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="status-filter">Status</Label>
        <Select
          value={localFilters.status || "all"}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger id="status-filter" className="w-full">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {USER_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-2">
        <Label htmlFor="domain-filter">Domain</Label>
        <Input
          id="domain-filter"
          type="text"
          placeholder="e.g., example.com"
          value={localFilters.domain || ""}
          onChange={(e) => handleDomainChange(e.target.value)}
        />
      </div>

      <div className="flex-1 space-y-2">
        <Label htmlFor="role-filter">Role</Label>
        <Select
          value={localFilters.role || "all"}
          onValueChange={handleRoleChange}
        >
          <SelectTrigger id="role-filter" className="w-full">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {USER_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Button variant="outline" onClick={handleReset}>
          Clear
        </Button>
      </div>
    </div>
  );
}

