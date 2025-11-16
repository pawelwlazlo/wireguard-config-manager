/**
 * StatusBar component - displays overall system status with colored indicator
 */

import type { SystemStatus } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBarProps {
  status: SystemStatus;
}

const statusConfig = {
  ok: {
    label: "System Operational",
    color: "text-green-600",
    bgColor: "bg-green-100",
    borderColor: "border-green-200",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  degraded: {
    label: "System Degraded",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-200",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  down: {
    label: "System Down",
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-200",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

export function StatusBar({ status }: StatusBarProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-4",
        config.bgColor,
        config.borderColor
      )}
      role="status"
      aria-label={`System status: ${config.label}`}
    >
      <div className={config.color}>{config.icon}</div>
      <div className="flex-1">
        <p className={cn("font-semibold", config.color)}>{config.label}</p>
      </div>
    </div>
  );
}

