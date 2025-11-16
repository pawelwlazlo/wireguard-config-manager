/**
 * Audit Log Filters Component
 * Provides event type and date range filtering
 */

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditFiltersState, AuditEvent } from "@/types";

interface AuditFiltersProps {
  value: AuditFiltersState;
  onChange: (filters: AuditFiltersState) => void;
}

const AUDIT_EVENTS: { value: AuditEvent; label: string }[] = [
  { value: "LOGIN", label: "Login" },
  { value: "PEER_CLAIM", label: "Peer Claim" },
  { value: "PEER_ASSIGN", label: "Peer Assign" },
  { value: "PEER_DOWNLOAD", label: "Peer Download" },
  { value: "PEER_REVOKE", label: "Peer Revoke" },
  { value: "RESET_PASSWORD", label: "Reset Password" },
  { value: "PASSWORD_CHANGE", label: "Password Change" },
  { value: "LIMIT_CHANGE", label: "Limit Change" },
  { value: "USER_DEACTIVATE", label: "User Deactivate" },
  { value: "IMPORT", label: "Import" },
];

export function AuditFilters({ value, onChange }: AuditFiltersProps) {
  const handleEventTypeChange = (eventType: string) => {
    onChange({
      ...value,
      eventType: eventType === "all" ? undefined : (eventType as AuditEvent),
    });
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined;
    onChange({
      ...value,
      from: date,
    });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined;
    onChange({
      ...value,
      to: date,
    });
  };

  const handleReset = () => {
    onChange({});
  };

  // Validation: from <= to
  const isDateRangeValid = !value.from || !value.to || value.from <= value.to;

  // Validation: max 31 days
  const isDurationValid =
    !value.from ||
    !value.to ||
    (value.to.getTime() - value.from.getTime()) / (1000 * 60 * 60 * 24) <= 31;

  return (
    <div className="mb-6 rounded-lg border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Event Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="event-type">Event Type</Label>
          <Select
            value={value.eventType || "all"}
            onValueChange={handleEventTypeChange}
          >
            <SelectTrigger id="event-type" aria-label="Filter by event type">
              <SelectValue placeholder="All events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {AUDIT_EVENTS.map((event) => (
                <SelectItem key={event.value} value={event.value}>
                  {event.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From Filter */}
        <div className="space-y-2">
          <Label htmlFor="date-from">From</Label>
          <input
            id="date-from"
            type="date"
            aria-label="Filter from date"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={value.from ? value.from.toISOString().split("T")[0] : ""}
            onChange={handleFromChange}
          />
        </div>

        {/* Date To Filter */}
        <div className="space-y-2">
          <Label htmlFor="date-to">To</Label>
          <input
            id="date-to"
            type="date"
            aria-label="Filter to date"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={value.to ? value.to.toISOString().split("T")[0] : ""}
            onChange={handleToChange}
          />
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full"
            aria-label="Reset filters"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Validation Messages */}
      {!isDateRangeValid && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          "From" date must be before or equal to "To" date
        </p>
      )}
      {!isDurationValid && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          Date range cannot exceed 31 days
        </p>
      )}
    </div>
  );
}

