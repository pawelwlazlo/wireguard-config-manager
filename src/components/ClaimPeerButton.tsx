/**
 * ClaimPeerButton component - CTA for claiming new peer
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PeerDto } from "@/types";

interface ClaimPeerButtonProps {
  disabled: boolean;
  onClaimSuccess: (peer: PeerDto) => void;
  onClaimError: (error: Error) => void;
}

export function ClaimPeerButton({
  disabled,
  onClaimSuccess,
  onClaimError,
}: ClaimPeerButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/peers/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to claim peer");
      }

      const peer: PeerDto = await response.json();
      onClaimSuccess(peer);
    } catch (error) {
      onClaimError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClaim}
      disabled={disabled || loading}
      size="lg"
      className="w-full sm:w-auto"
    >
      {loading ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Claiming...
        </>
      ) : (
        <>
          <svg
            className="mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Get New Configuration
        </>
      )}
    </Button>
  );
}

