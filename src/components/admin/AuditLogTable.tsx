/**
 * Audit Log Table Component
 * Displays audit log entries with sortable columns
 */

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuditDto, AuditSortOption } from "@/types";

interface AuditLogTableProps {
  data: AuditDto[];
  sort: AuditSortOption;
  onSortChange: (sort: AuditSortOption) => void;
}

const EVENT_LABELS: Record<string, string> = {
  LOGIN: "Login",
  PEER_CLAIM: "Peer Claim",
  PEER_ASSIGN: "Peer Assign",
  PEER_DOWNLOAD: "Peer Download",
  PEER_REVOKE: "Peer Revoke",
  RESET_PASSWORD: "Reset Password",
  PASSWORD_CHANGE: "Password Change",
  LIMIT_CHANGE: "Limit Change",
  USER_DEACTIVATE: "User Deactivate",
  IMPORT: "Import",
};

export function AuditLogTable({ data, sort, onSortChange }: AuditLogTableProps) {
  const handleSort = (column: "created_at" | "event_type") => {
    const currentDirection = sort.includes(column) && sort.endsWith(":asc") ? "asc" : "desc";
    const newDirection = currentDirection === "asc" ? "desc" : "asc";
    onSortChange(`${column}:${newDirection}` as AuditSortOption);
  };

  const getSortIcon = (column: "created_at" | "event_type") => {
    if (!sort.includes(column)) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sort.endsWith(":asc") ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pl-PL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  const formatMetadata = (metadata: unknown) => {
    if (!metadata || typeof metadata !== "object") {
      return "—";
    }
    
    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return "—";
    }
  };

  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No audit log entries found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Audit log table">
          <thead className="border-b bg-muted/50">
            <tr>
              <th scope="col" className="p-4 text-left">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("created_at")}
                  className="font-semibold hover:bg-transparent"
                  aria-label="Sort by date"
                >
                  Date
                  {getSortIcon("created_at")}
                </Button>
              </th>
              <th scope="col" className="p-4 text-left">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("event_type")}
                  className="font-semibold hover:bg-transparent"
                  aria-label="Sort by event type"
                >
                  Event
                  {getSortIcon("event_type")}
                </Button>
              </th>
              <th scope="col" className="p-4 text-left font-semibold">
                Actor
              </th>
              <th scope="col" className="p-4 text-left font-semibold">
                Subject
              </th>
              <th scope="col" className="p-4 text-left font-semibold">
                Metadata
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr
                key={entry.id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <td className="p-4 text-sm">
                  <time dateTime={entry.created_at}>
                    {formatDate(entry.created_at)}
                  </time>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {EVENT_LABELS[entry.event_type] || entry.event_type}
                  </span>
                </td>
                <td className="p-4 text-sm font-mono text-muted-foreground">
                  {entry.actor_id ? (
                    <span title={entry.actor_id}>
                      {entry.actor_id.substring(0, 8)}...
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-4 text-sm">
                  {entry.subject_id && entry.subject_table ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">
                        {entry.subject_table}
                      </span>
                      <span className="font-mono" title={entry.subject_id}>
                        {entry.subject_id.substring(0, 8)}...
                      </span>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-4">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View
                    </summary>
                    <pre className="mt-2 max-w-md overflow-x-auto rounded bg-muted p-2 text-xs">
                      {formatMetadata(entry.metadata)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

