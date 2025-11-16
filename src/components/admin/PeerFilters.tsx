/**
 * Filters component for admin peers list
 */

import { useState } from "react";
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
import type { PeerFiltersState, PeerStatus } from "@/types";

interface PeerFiltersProps {
  value: PeerFiltersState;
  onChange: (filters: PeerFiltersState) => void;
  onSubmit: (filters: PeerFiltersState) => void;
}

const PEER_STATUSES: { value: PeerStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function PeerFilters({ value, onChange, onSubmit }: PeerFiltersProps) {
  const [localFilters, setLocalFilters] = useState<PeerFiltersState>(value);

  const handleStatusChange = (status: string) => {
    const newFilters = {
      ...localFilters,
      status: status === "all" ? undefined : (status as PeerStatus),
    };
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  const handleOwnerChange = (owner: string) => {
    const newFilters = {
      ...localFilters,
      owner: owner.trim() || undefined,
    };
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  const handleApply = () => {
    onSubmit(localFilters);
  };

  const handleReset = () => {
    const emptyFilters: PeerFiltersState = {};
    setLocalFilters(emptyFilters);
    onChange(emptyFilters);
    onSubmit(emptyFilters);
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
            {PEER_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-2">
        <Label htmlFor="owner-filter">Owner UUID</Label>
        <Input
          id="owner-filter"
          type="text"
          placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
          value={localFilters.owner || ""}
          onChange={(e) => handleOwnerChange(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleApply}>Apply</Button>
        <Button variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}

