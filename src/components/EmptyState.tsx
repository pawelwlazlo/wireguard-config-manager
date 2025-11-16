/**
 * EmptyState component - displays when user has no peers or reached limit
 */

interface EmptyStateProps {
  variant: "no-peers" | "limit-reached";
  onAction?: () => void;
}

export function EmptyState({ variant, onAction }: EmptyStateProps) {
  if (variant === "limit-reached") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-24 w-24 text-muted-foreground/50"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold">Configuration Limit Reached</h3>
        <p className="mb-6 max-w-md text-sm text-muted-foreground">
          You have reached your maximum number of allowed configurations. To claim a
          new configuration, please revoke one of your existing configurations first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-6">
        <svg
          className="mx-auto h-24 w-24 text-muted-foreground/50"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold">No Configurations Yet</h3>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        You haven't claimed any WireGuard configurations yet. Click the "Get New
        Configuration" button above to claim your first one.
      </p>
      {onAction && (
        <button
          onClick={onAction}
          className="text-sm font-medium text-primary hover:underline"
        >
          Get Started →
        </button>
      )}
    </div>
  );
}

