/**
 * StatsCard component - displays peer usage statistics
 */

import { cn } from "@/lib/utils";

interface StatsCardProps {
  claimedCount: number;
  peerLimit: number;
  className?: string;
}

export function StatsCard({ claimedCount, peerLimit, className }: StatsCardProps) {
  const percentage = peerLimit > 0 ? (claimedCount / peerLimit) * 100 : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = claimedCount >= peerLimit;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 text-card-foreground shadow-sm",
        className
      )}
      role="region"
      aria-label="Configuration usage statistics"
    >
      <div className="flex flex-col space-y-1.5">
        <h3 className="text-sm font-medium text-muted-foreground">
          Active Configurations
        </h3>
        <div className="flex items-baseline space-x-2">
          <span
            className={cn(
              "text-4xl font-bold tabular-nums",
              isAtLimit && "text-destructive",
              isNearLimit && !isAtLimit && "text-yellow-600"
            )}
          >
            {claimedCount}
          </span>
          <span className="text-2xl text-muted-foreground">/</span>
          <span className="text-2xl font-semibold text-muted-foreground">
            {peerLimit}
          </span>
        </div>
        {isAtLimit && (
          <p className="text-xs text-destructive">
            You have reached your configuration limit
          </p>
        )}
        {isNearLimit && !isAtLimit && (
          <p className="text-xs text-yellow-600">
            You are approaching your configuration limit
          </p>
        )}
      </div>
      <div className="mt-4">
        <div 
          className="h-2 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={claimedCount}
          aria-valuemin={0}
          aria-valuemax={peerLimit}
          aria-label={`${claimedCount} of ${peerLimit} configurations used`}
        >
          <div
            className={cn(
              "h-full transition-all duration-300",
              isAtLimit && "bg-destructive",
              isNearLimit && !isAtLimit && "bg-yellow-500",
              !isNearLimit && "bg-primary"
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

