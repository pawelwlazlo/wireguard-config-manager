/**
 * Reusable error banner component for displaying error messages
 */

import type { ReactNode } from "react";

interface ErrorBannerProps {
  message: string;
  children?: ReactNode;
}

export function ErrorBanner({ message, children }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400"
    >
      <div className="flex items-start gap-3">
        <svg
          className="h-5 w-5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

